import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Generator,
  WorkSession,
  Refill,
  MaintenanceTask,
  EntityType,
  LocalData,
  SyncEntity,
  Tombstone,
  LegacySyncQueueItem,
} from '../models/types';
import { createMutex } from './mutex';
import { toIsoTimestamp, nextModificationTime } from './syncMeta';

/**
 * Local data access layer — AsyncStorage is the source of truth.
 *
 * Sync model (since 2.4.2):
 * - every local create/update marks the record `syncStatus: 'pending'` with a fresh,
 *   monotonic `lastModified`; the sync service pushes all pending records;
 * - every local delete records a tombstone (see `Tombstone`) so the deletion reaches the
 *   cloud even if it happened while signed out, and a pull can never resurrect it;
 * - all writes go through one FIFO mutex, so concurrent writers (UI, realtime listeners,
 *   sync) can no longer overwrite each other's read-modify-write cycles.
 */

export const STORAGE_KEYS: Record<EntityType, string> = {
  generator: '@generators',
  workSession: '@work_sessions',
  refill: '@refills',
  maintenance: '@maintenance_tasks',
};
const TOMBSTONES_KEY = '@sync_tombstones';
const LEGACY_QUEUE_KEY = '@sync_queue';
const LANGUAGE_KEY = '@app_language';

export const ENTITY_TYPES: EntityType[] = ['generator', 'workSession', 'refill', 'maintenance'];

export const COLLECTION_FIELD: Record<EntityType, keyof LocalData> = {
  generator: 'generators',
  workSession: 'workSessions',
  refill: 'refills',
  maintenance: 'maintenanceTasks',
};

export interface LocalState extends LocalData {
  tombstones: Tombstone[];
}

export type LocalStateChanges = Partial<LocalState>;

const storageMutex = createMutex();

export const tombstoneKey = (entityType: EntityType, entityId: string): string => `${entityType}:${entityId}`;

// ============= Low-level reads =============

/**
 * Read a JSON array. Unreadable data is copied to a backup key and then cleared, so the
 * app keeps working and the original bytes can still be recovered.
 */
const readArray = async <T>(key: string): Promise<T[]> => {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch (error) {
    console.error(`Error reading ${key}:`, error);
    return [];
  }
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('stored value is not an array');
    return parsed.filter(item => item && typeof item === 'object') as T[];
  } catch (error) {
    console.error(`Stored data under ${key} is unreadable; keeping a backup copy.`, error);
    try {
      await AsyncStorage.setItem(`${key}.corrupt-${Date.now()}`, raw);
      await AsyncStorage.removeItem(key);
    } catch (backupError) {
      console.error(`Could not back up ${key}:`, backupError);
    }
    return [];
  }
};

/** Repair sync metadata written by older app versions (e.g. Firestore Timestamp objects). */
const normalizeRecord = <T extends SyncEntity>(record: T): T => {
  const normalized = {
    ...record,
    lastModified: toIsoTimestamp(record.lastModified),
    syncStatus: record.syncStatus === 'synced' ? 'synced' : 'pending',
  } as T;
  if (record.syncedAt !== undefined) {
    normalized.syncedAt = toIsoTimestamp(record.syncedAt);
  }
  return normalized;
};

const readCollection = async <T extends SyncEntity>(entityType: EntityType): Promise<T[]> => {
  const records = await readArray<T>(STORAGE_KEYS[entityType]);
  return records.filter(r => typeof r.id === 'string' && r.id.length > 0).map(normalizeRecord);
};

const readStateUnlocked = async (): Promise<LocalState> => {
  const [generators, workSessions, refills, maintenanceTasks, tombstones] = await Promise.all([
    readCollection<Generator>('generator'),
    readCollection<WorkSession>('workSession'),
    readCollection<Refill>('refill'),
    readCollection<MaintenanceTask>('maintenance'),
    readArray<Tombstone>(TOMBSTONES_KEY),
  ]);
  return { generators, workSessions, refills, maintenanceTasks, tombstones };
};

const writeChangesUnlocked = async (changes: LocalStateChanges): Promise<void> => {
  const pairs: [string, string][] = [];
  for (const entityType of ENTITY_TYPES) {
    const value = changes[COLLECTION_FIELD[entityType]];
    if (value) pairs.push([STORAGE_KEYS[entityType], JSON.stringify(value)]);
  }
  if (changes.tombstones) pairs.push([TOMBSTONES_KEY, JSON.stringify(changes.tombstones)]);
  if (pairs.length > 0) await AsyncStorage.multiSet(pairs);
};

// ============= Legacy sync queue migration =============

/**
 * Before 2.4.2 pending changes lived in a persisted queue (`@sync_queue`). Convert it
 * once: queued deletes become tombstones, queued creates/updates mark their record
 * pending (older versions could mark an un-pushed record "synced").
 */
const migrateLegacyQueueUnlocked = async (): Promise<void> => {
  const raw = await AsyncStorage.getItem(LEGACY_QUEUE_KEY);
  if (raw === null) return;

  const items = await readArray<LegacySyncQueueItem>(LEGACY_QUEUE_KEY);
  if (items.length > 0) {
    const state = await readStateUnlocked();
    const changes: LocalStateChanges = {};
    let tombstones = state.tombstones;

    for (const item of items) {
      if (!item || !ENTITY_TYPES.includes(item.entityType) || !item.entityId) continue;
      if (item.operation === 'delete') {
        tombstones = upsertTombstone(tombstones, {
          entityType: item.entityType,
          entityId: item.entityId,
          generatorId: item.data?.generatorId,
          deletedAt: toIsoTimestamp(item.timestamp),
        });
      } else {
        const field = COLLECTION_FIELD[item.entityType];
        const list = (changes[field] ?? state[field]) as SyncEntity[];
        const index = list.findIndex(r => r.id === item.entityId);
        if (index >= 0 && list[index].syncStatus !== 'pending') {
          const next = [...list];
          next[index] = { ...list[index], syncStatus: 'pending' };
          (changes as Record<string, SyncEntity[]>)[field] = next;
        }
      }
    }
    if (tombstones !== state.tombstones) changes.tombstones = tombstones;
    await writeChangesUnlocked(changes);
  }
  await AsyncStorage.removeItem(LEGACY_QUEUE_KEY);
};

const upsertTombstone = (
  tombstones: Tombstone[],
  entry: Omit<Tombstone, 'key'>
): Tombstone[] => {
  const key = tombstoneKey(entry.entityType, entry.entityId);
  const tombstone: Tombstone = { key, ...entry };
  if (tombstone.generatorId === undefined) delete tombstone.generatorId;
  return [...tombstones.filter(t => t.key !== key), tombstone];
};

// ============= Locked read-modify-write =============

/**
 * Run `updater` against a fresh copy of all local data while holding the storage lock,
 * then persist whatever it returns in a single multiSet. Callers must treat the state
 * as immutable and return new arrays for the collections they change.
 */
export const updateLocalData = (
  updater: (state: LocalState) => LocalStateChanges | void | Promise<LocalStateChanges | void>
): Promise<void> =>
  storageMutex.run(async () => {
    await migrateLegacyQueueUnlocked();
    const state = await readStateUnlocked();
    const changes = await updater(state);
    if (changes) await writeChangesUnlocked(changes);
  });

/** Ensure an old install's queue is migrated before tombstones/pending counts are read. */
const ensureMigrated = async (): Promise<void> => {
  if ((await AsyncStorage.getItem(LEGACY_QUEUE_KEY)) !== null) {
    await updateLocalData(() => undefined);
  }
};

// ============= Language =============

export const getSavedLanguage = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(LANGUAGE_KEY);
  } catch (error) {
    console.error('Error getting language:', error);
    return null;
  }
};

export const saveLanguage = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

// ============= Appearance =============

export type ThemePreference = 'system' | 'light' | 'dark';
const THEME_KEY = '@theme_preference';

export const getThemePreference = async (): Promise<ThemePreference> => {
  try {
    const value = await AsyncStorage.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
};

export const saveThemePreference = async (preference: ThemePreference): Promise<void> => {
  try {
    await AsyncStorage.setItem(THEME_KEY, preference);
  } catch (error) {
    console.error('Error saving theme preference:', error);
  }
};

// ============= Generic entity writes =============

/**
 * Store a record edited on this device: always pending, always newer than the stored
 * version. Cloud metadata (`syncedAt`, `userId`) of the stored version is kept.
 */
const saveEntity = async <T extends SyncEntity>(entityType: EntityType, entity: T): Promise<void> => {
  await updateLocalData(state => {
    const field = COLLECTION_FIELD[entityType];
    const list = state[field] as T[];
    const index = list.findIndex(r => r.id === entity.id);
    const existing = index >= 0 ? list[index] : undefined;

    const record = {
      ...entity,
      lastModified: nextModificationTime(existing?.lastModified),
      syncStatus: 'pending',
      syncedAt: existing?.syncedAt,
      userId: existing?.userId,
    } as T;

    const next = [...list];
    if (index >= 0) next[index] = record;
    else next.push(record);
    return { [field]: next } as LocalStateChanges;
  });
};

const deleteEntity = async (entityType: EntityType, id: string): Promise<void> => {
  await updateLocalData(state => {
    const field = COLLECTION_FIELD[entityType];
    const list = state[field] as SyncEntity[];
    const record = list.find(r => r.id === id);
    if (!record) return;

    const changes: LocalStateChanges = { [field]: list.filter(r => r.id !== id) } as LocalStateChanges;
    let tombstones = state.tombstones;

    if (entityType === 'generator') {
      // Cascade locally; the cloud cascade happens when the tombstone is pushed.
      changes.workSessions = state.workSessions.filter(s => s.generatorId !== id);
      changes.refills = state.refills.filter(r => r.generatorId !== id);
      changes.maintenanceTasks = state.maintenanceTasks.filter(m => m.generatorId !== id);
      // Child tombstones of this generator are covered by the generator's own.
      tombstones = tombstones.filter(t => t.generatorId !== id);
    }

    changes.tombstones = upsertTombstone(tombstones, {
      entityType,
      entityId: id,
      generatorId: 'generatorId' in record ? record.generatorId : undefined,
      deletedAt: new Date().toISOString(),
    });
    return changes;
  });
};

// ============= Generators =============

export const getGenerators = async (): Promise<Generator[]> => readCollection<Generator>('generator');

export const saveGenerator = async (generator: Generator): Promise<void> => {
  try {
    await saveEntity('generator', generator);
  } catch (error) {
    console.error('Error saving generator:', error);
    throw error;
  }
};

export const deleteGenerator = async (id: string): Promise<void> => {
  try {
    await deleteEntity('generator', id);
  } catch (error) {
    console.error('Error deleting generator:', error);
    throw error;
  }
};

// ============= Work sessions =============

export const getWorkSessions = async (generatorId?: string): Promise<WorkSession[]> => {
  const sessions = await readCollection<WorkSession>('workSession');
  return generatorId ? sessions.filter(s => s.generatorId === generatorId) : sessions;
};

export const saveWorkSession = async (session: WorkSession): Promise<void> => {
  try {
    await saveEntity('workSession', session);
  } catch (error) {
    console.error('Error saving work session:', error);
    throw error;
  }
};

export const deleteWorkSession = async (id: string): Promise<void> => {
  try {
    await deleteEntity('workSession', id);
  } catch (error) {
    console.error('Error deleting work session:', error);
    throw error;
  }
};

export const getActiveWorkSession = async (generatorId: string): Promise<WorkSession | null> => {
  const sessions = await getWorkSessions(generatorId);
  return sessions.find(s => s.isActive) || null;
};

// ============= Refills =============

export const getRefills = async (generatorId?: string): Promise<Refill[]> => {
  const refills = await readCollection<Refill>('refill');
  return generatorId ? refills.filter(r => r.generatorId === generatorId) : refills;
};

export const saveRefill = async (refill: Refill): Promise<void> => {
  try {
    await saveEntity('refill', refill);
  } catch (error) {
    console.error('Error saving refill:', error);
    throw error;
  }
};

export const deleteRefill = async (id: string): Promise<void> => {
  try {
    await deleteEntity('refill', id);
  } catch (error) {
    console.error('Error deleting refill:', error);
    throw error;
  }
};

// ============= Maintenance tasks =============

export const getMaintenanceTasks = async (generatorId?: string): Promise<MaintenanceTask[]> => {
  const tasks = await readCollection<MaintenanceTask>('maintenance');
  return generatorId ? tasks.filter(t => t.generatorId === generatorId) : tasks;
};

export const saveMaintenanceTask = async (task: MaintenanceTask): Promise<void> => {
  try {
    await saveEntity('maintenance', task);
  } catch (error) {
    console.error('Error saving maintenance task:', error);
    throw error;
  }
};

export const deleteMaintenanceTask = async (id: string): Promise<void> => {
  try {
    await deleteEntity('maintenance', id);
  } catch (error) {
    console.error('Error deleting maintenance task:', error);
    throw error;
  }
};

// ============= Sync-facing API (used by src/services/sync.ts) =============

/** Snapshot of all local records (not locked; use updateLocalData to modify). */
export const getLocalData = async (): Promise<LocalData> => {
  const { tombstones: _ignored, ...data } = await readStateUnlocked();
  return data;
};

export const getTombstones = async (): Promise<Tombstone[]> => {
  await ensureMigrated();
  return readArray<Tombstone>(TOMBSTONES_KEY);
};

/** Drop tombstones whose deletion has reached the cloud. */
export const removeTombstones = async (keys: string[]): Promise<void> => {
  if (keys.length === 0) return;
  const done = new Set(keys);
  await updateLocalData(state => ({ tombstones: state.tombstones.filter(t => !done.has(t.key)) }));
};

export interface SyncedEntry {
  entityType: EntityType;
  id: string;
  lastModified: string; // the version that was pushed
}

/**
 * Mark pushed records as synced — but only if they were not edited again while the
 * push was in flight (their lastModified still equals the pushed version).
 */
export const markSynced = async (entries: SyncedEntry[], userId: string, syncedAt: string): Promise<void> => {
  if (entries.length === 0) return;
  await updateLocalData(state => {
    const changes: LocalStateChanges = {};
    for (const entityType of ENTITY_TYPES) {
      const pushed = new Map(
        entries.filter(e => e.entityType === entityType).map(e => [e.id, e.lastModified])
      );
      if (pushed.size === 0) continue;
      const field = COLLECTION_FIELD[entityType];
      const list = state[field] as SyncEntity[];
      let changed = false;
      const next = list.map(record => {
        const version = pushed.get(record.id);
        if (version === undefined || record.lastModified !== version) return record;
        changed = true;
        return { ...record, syncStatus: 'synced' as const, syncedAt, userId };
      });
      if (changed) (changes as Record<string, SyncEntity[]>)[field] = next;
    }
    return changes;
  });
};

/**
 * Account deletion: keep every record on the device but detach it from the deleted
 * account — pending again, without the cloud owner or sync time — so nothing treats it
 * as "known to be in the cloud" (a later sign-in, with any account, uploads it as new).
 */
export const detachFromAccount = async (): Promise<void> => {
  await updateLocalData(state => {
    const changes: LocalStateChanges = {};
    for (const entityType of ENTITY_TYPES) {
      const field = COLLECTION_FIELD[entityType];
      (changes as Record<string, SyncEntity[]>)[field] = (state[field] as SyncEntity[]).map(record => {
        const { syncedAt: _syncedAt, userId: _userId, ...rest } = record;
        return { ...rest, syncStatus: 'pending' as const };
      });
    }
    return changes;
  });
};

/** Drop all pending cloud deletions (the cloud copy is gone, e.g. after account deletion). */
export const clearTombstones = async (): Promise<void> => {
  await updateLocalData(state => (state.tombstones.length > 0 ? { tombstones: [] } : undefined));
};

/** Local changes that have not reached the cloud yet (pending records + deletions). */
export const getPendingChangesCount = async (): Promise<number> => {
  await ensureMigrated();
  const state = await readStateUnlocked();
  const pendingRecords = ENTITY_TYPES.reduce(
    (sum, entityType) =>
      sum + (state[COLLECTION_FIELD[entityType]] as SyncEntity[]).filter(r => r.syncStatus !== 'synced').length,
    0
  );
  return pendingRecords + state.tombstones.length;
};
