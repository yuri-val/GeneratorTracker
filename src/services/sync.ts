import { onSnapshot, Query, CollectionReference, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { EntityType, SyncEntity } from '../models/types';
import {
  CHILD_TYPES,
  fetchAllRemoteData,
  writeEntities,
  deleteRemoteEntities,
  fromFirestoreDoc,
  generatorsCollectionRef,
  childCollectionGroupQuery,
  EntityWrite,
} from './firestore';
import { applyRemoteChanges, RemoteChangeSet } from './syncMerge';
import {
  COLLECTION_FIELD,
  getLocalData,
  getTombstones,
  markSynced,
  removeTombstones,
  updateLocalData,
} from '../utils/storage';
import { createMutex } from '../utils/mutex';

/**
 * Sync Service — local AsyncStorage ⇄ Firestore.
 *
 * A full sync is: push (tombstones → cloud deletes, pending records → cloud writes),
 * then pull (complete remote snapshot merged by `applyRemoteChanges`). Pending state is
 * derived from the records themselves, so nothing is ever dropped after N failures —
 * whatever did not reach the cloud stays pending and is retried by the next sync.
 * Realtime listeners apply remote changes while signed in.
 */

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

let syncStatus: SyncStatus = 'idle';
const syncMutex = createMutex();
let listenerUnsubscribers: (() => void)[] = [];
let listenerGeneration = 0;

export const getSyncStatus = (): SyncStatus => syncStatus;

/** A record must be uploaded if it changed locally or is not in this account's cloud yet. */
const needsPush = (record: SyncEntity, uid: string): boolean =>
  record.syncStatus !== 'synced' || record.userId !== uid;

export class SyncError extends Error {
  readonly causes: Error[];
  constructor(causes: Error[]) {
    super(causes.map(c => c.message).join('; '));
    this.name = 'SyncError';
    this.causes = causes;
  }
}

/**
 * Push local changes. Returns the failures instead of throwing so the pull still runs;
 * everything that failed stays pending/tombstoned for the next attempt.
 */
export const pushLocalChanges = async (uid: string): Promise<Error[]> => {
  const errors: Error[] = [];

  // 1. Deletions first, so a following pull cannot bring deleted records back.
  const tombstones = await getTombstones();
  if (tombstones.length > 0) {
    const result = await deleteRemoteEntities(uid, tombstones);
    await removeTombstones(result.done.map(t => t.key));
    if (result.error) errors.push(result.error);
  }

  const local = await getLocalData();
  const syncedAt = () => new Date().toISOString();

  // 2. Generators before their children.
  const generatorWrites: EntityWrite[] = local.generators
    .filter(g => needsPush(g, uid))
    .map(entity => ({ entityType: 'generator', entity }));
  const failedGenerators = new Set<string>();
  if (generatorWrites.length > 0) {
    const result = await writeEntities(uid, generatorWrites);
    await markSynced(
      result.done.map(w => ({ entityType: w.entityType, id: w.entity.id, lastModified: w.entity.lastModified })),
      uid,
      syncedAt()
    );
    const doneIds = new Set(result.done.map(w => w.entity.id));
    generatorWrites.forEach(w => !doneIds.has(w.entity.id) && failedGenerators.add(w.entity.id));
    if (result.error) errors.push(result.error);
  }

  // 3. Children — only those whose generator exists in the cloud (never create orphans).
  const cloudGeneratorIds = new Set(local.generators.map(g => g.id).filter(id => !failedGenerators.has(id)));
  const childWrites: EntityWrite[] = CHILD_TYPES.flatMap(entityType =>
    (local[COLLECTION_FIELD[entityType]] as Array<SyncEntity & { generatorId: string }>)
      .filter(r => needsPush(r, uid) && cloudGeneratorIds.has(r.generatorId))
      .map(entity => ({ entityType, entity }))
  );
  if (childWrites.length > 0) {
    const result = await writeEntities(uid, childWrites);
    await markSynced(
      result.done.map(w => ({ entityType: w.entityType, id: w.entity.id, lastModified: w.entity.lastModified })),
      uid,
      syncedAt()
    );
    if (result.error) errors.push(result.error);
  }

  return errors;
};

/** Download the complete remote state and merge it into local storage. */
export const pullRemoteChanges = async (uid: string): Promise<void> => {
  const { data, fetchedAt } = await fetchAllRemoteData(uid);
  const syncedAt = new Date().toISOString();
  const changeSets: RemoteChangeSet[] = [
    { entityType: 'generator', upserts: data.generators, presentIds: data.generators.map(g => g.id) },
    { entityType: 'workSession', upserts: data.workSessions, presentIds: data.workSessions.map(r => r.id) },
    { entityType: 'refill', upserts: data.refills, presentIds: data.refills.map(r => r.id) },
    { entityType: 'maintenance', upserts: data.maintenanceTasks, presentIds: data.maintenanceTasks.map(r => r.id) },
  ];

  await updateLocalData(state => {
    const { tombstones, ...local } = state;
    return applyRemoteChanges(local, changeSets, { uid, syncedAt, snapshotTime: fetchedAt, tombstones });
  });
};

/** Push then pull. Syncs never overlap: concurrent calls run one after another. */
export const performFullSync = (uid: string): Promise<void> =>
  syncMutex.run(async () => {
    syncStatus = 'syncing';
    try {
      const pushErrors = await pushLocalChanges(uid);
      await pullRemoteChanges(uid);
      if (pushErrors.length > 0) throw new SyncError(pushErrors);
      syncStatus = 'synced';
    } catch (error) {
      console.error('Sync error:', error);
      syncStatus = 'error';
      throw error;
    }
  });

/** After sign-in: full sync, then realtime listeners. */
export const performInitialSync = async (userId: string): Promise<void> => {
  await performFullSync(userId);
  startRealtimeListeners(userId);
};

/** "Sync Now". */
export const performManualSync = (userId: string): Promise<void> => performFullSync(userId);

// ============= Realtime listeners =============

const toChangeSet = (
  entityType: EntityType,
  snapshot: QuerySnapshot<DocumentData>,
  complete: boolean
): RemoteChangeSet | null => {
  if (complete) {
    return {
      entityType,
      // Documents with pending local writes are this device's own un-acknowledged
      // writes: count them as present, but do not treat them as confirmed remote data.
      upserts: snapshot.docs.filter(d => !d.metadata.hasPendingWrites).map(d => fromFirestoreDoc(d.data(), d.id)),
      presentIds: snapshot.docs.map(d => d.id),
    };
  }

  const upserts: SyncEntity[] = [];
  const removedIds: string[] = [];
  for (const change of snapshot.docChanges()) {
    if (change.doc.metadata.hasPendingWrites) continue;
    if (change.type === 'removed') removedIds.push(change.doc.id);
    else upserts.push(fromFirestoreDoc(change.doc.data(), change.doc.id));
  }
  return upserts.length > 0 || removedIds.length > 0 ? { entityType, upserts, removedIds } : null;
};

/**
 * Listen to all four collections. The first snapshot that comes from the server is
 * treated as a complete snapshot (reconciles deletions made while this device was
 * offline); cache-only snapshots never prune anything.
 */
export const startRealtimeListeners = (userId: string): void => {
  stopRealtimeListeners();
  const generation = ++listenerGeneration;

  const subscribe = (entityType: EntityType, target: Query<DocumentData> | CollectionReference<DocumentData>) => {
    let reconciled = false;
    return onSnapshot(
      target,
      snapshot => {
        if (generation !== listenerGeneration) return;
        const complete = !reconciled && !snapshot.metadata.fromCache;
        if (complete) reconciled = true;

        const changeSet = toChangeSet(entityType, snapshot, complete);
        if (!changeSet) return;

        const receivedAt = new Date().toISOString();
        // Called synchronously so the write is queued in snapshot order.
        updateLocalData(state => {
          const { tombstones, ...local } = state;
          return applyRemoteChanges(local, [changeSet], {
            uid: userId,
            syncedAt: receivedAt,
            snapshotTime: receivedAt,
            tombstones,
          });
        }).catch(error => console.error(`Error applying remote ${entityType} changes:`, error));
      },
      error => {
        console.error(`Realtime listener for ${entityType} failed:`, error);
        if (generation === listenerGeneration) syncStatus = 'error';
      }
    );
  };

  listenerUnsubscribers = [
    subscribe('generator', generatorsCollectionRef(userId)),
    ...CHILD_TYPES.map(type => subscribe(type, childCollectionGroupQuery(type, userId))),
  ];
};

export const stopRealtimeListeners = (): void => {
  listenerGeneration++;
  listenerUnsubscribers.forEach(unsubscribe => unsubscribe());
  listenerUnsubscribers = [];
};
