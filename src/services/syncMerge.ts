import { EntityType, LocalData, SyncEntity, Tombstone } from '../models/types';
import { toIsoTimestamp, compareTimestamps } from '../utils/syncMeta';
import { COLLECTION_FIELD, tombstoneKey } from '../utils/storage';

/**
 * Pure merge of remote (Firestore) state into local state. No I/O — fully unit tested.
 *
 * Rules
 * - Last write wins on `lastModified` (client ISO time). Equal times mean the remote
 *   copy *is* this version, so the local record becomes synced.
 * - A local tombstone always wins: a record deleted on this device is never re-added
 *   (the deletion is pushed before any pull). Children of a tombstoned generator too.
 * - A remote deletion always wins (`removedIds`, or absence from a complete snapshot).
 *   Absence only deletes records known to have been in *this* account's cloud
 *   (`userId === uid` and synced/syncedAt before the snapshot was taken), so brand-new
 *   local records and data of another account are never touched.
 * - With a complete generator snapshot, remote children whose generator does not exist
 *   are orphans (left behind by older app versions) and are not stored; local children
 *   of generators that no longer exist are removed.
 */

export interface RemoteChangeSet {
  entityType: EntityType;
  /** Remote documents added or modified (or all of them for a complete snapshot). */
  upserts: SyncEntity[];
  /** Documents reported deleted by a realtime listener. */
  removedIds?: string[];
  /** Present ⇒ this is a complete snapshot: every id that currently exists remotely. */
  presentIds?: string[];
}

export interface MergeContext {
  uid: string;
  /** Written as `syncedAt` on records confirmed by this merge. */
  syncedAt: string;
  /** When the remote snapshot was requested; later-synced records are never pruned. */
  snapshotTime: string;
  tombstones: Tombstone[];
}

const REMOTE_ONLY_FIELDS = ['serverUpdatedAt'];

const toLocalRecord = <T extends SyncEntity>(remote: T, ctx: MergeContext): T => {
  const record = { ...remote } as Record<string, unknown>;
  for (const field of REMOTE_ONLY_FIELDS) delete record[field];
  return {
    ...(record as T),
    lastModified: toIsoTimestamp(remote.lastModified),
    syncStatus: 'synced',
    syncedAt: ctx.syncedAt,
  };
};

const isConfirmedInCloud = (record: SyncEntity, ctx: MergeContext): boolean => {
  if (record.userId !== ctx.uid) return false;
  if (record.syncedAt) return compareTimestamps(record.syncedAt, ctx.snapshotTime) < 0;
  return record.syncStatus === 'synced';
};

const mergeList = <T extends SyncEntity>(
  entityType: EntityType,
  local: T[],
  changes: RemoteChangeSet,
  ctx: MergeContext,
  tombstoneKeys: Set<string>,
  removed: Set<string>
): T[] => {
  const byId = new Map<string, T>(local.map(record => [record.id, record]));

  for (const raw of changes.upserts as T[]) {
    if (!raw || typeof raw.id !== 'string' || !raw.id) continue;
    if (tombstoneKeys.has(tombstoneKey(entityType, raw.id))) continue;

    const remote = toLocalRecord(raw, ctx);
    const current = byId.get(raw.id);
    if (!current) {
      byId.set(raw.id, remote);
      continue;
    }
    const cmp = compareTimestamps(remote.lastModified, current.lastModified);
    if (cmp > 0) {
      byId.set(raw.id, remote);
    } else if (cmp === 0) {
      byId.set(raw.id, { ...current, syncStatus: 'synced', syncedAt: ctx.syncedAt, userId: remote.userId ?? current.userId });
    }
    // cmp < 0: the local version is newer and stays (pending) until it is pushed.
  }

  for (const id of changes.removedIds ?? []) {
    if (byId.delete(id)) removed.add(id);
  }

  if (changes.presentIds) {
    const present = new Set(changes.presentIds);
    for (const [id, record] of byId) {
      if (!present.has(id) && isConfirmedInCloud(record, ctx)) {
        byId.delete(id);
        removed.add(id);
      }
    }
  }

  return Array.from(byId.values());
};

export const applyRemoteChanges = (
  local: LocalData,
  changeSets: RemoteChangeSet[],
  ctx: MergeContext
): LocalData => {
  const tombstoneKeys = new Set(ctx.tombstones.map(t => t.key));
  const tombstonedGenerators = new Set(
    ctx.tombstones.filter(t => t.entityType === 'generator').map(t => t.entityId)
  );
  const result: LocalData = { ...local };

  const generatorChanges = changeSets.find(c => c.entityType === 'generator');
  const removedGenerators = new Set<string>();
  if (generatorChanges) {
    result.generators = mergeList('generator', result.generators, generatorChanges, ctx, tombstoneKeys, removedGenerators);
  }
  const completeGenerators = !!generatorChanges?.presentIds;
  const generatorIds = new Set(result.generators.map(g => g.id));

  for (const changes of changeSets) {
    if (changes.entityType === 'generator') continue;
    const field = COLLECTION_FIELD[changes.entityType];
    const upserts = (changes.upserts as Array<SyncEntity & { generatorId?: string }>).filter(
      r =>
        !!r &&
        !tombstonedGenerators.has(r.generatorId ?? '') &&
        (!completeGenerators || generatorIds.has(r.generatorId ?? ''))
    );
    (result as unknown as Record<string, SyncEntity[]>)[field] = mergeList(
      changes.entityType,
      result[field] as SyncEntity[],
      { ...changes, upserts },
      ctx,
      tombstoneKeys,
      new Set()
    );
  }

  // Cascade: children follow their generator.
  if (completeGenerators || removedGenerators.size > 0) {
    const keep = (r: { generatorId: string }) =>
      completeGenerators ? generatorIds.has(r.generatorId) : !removedGenerators.has(r.generatorId);
    result.workSessions = result.workSessions.filter(keep);
    result.refills = result.refills.filter(keep);
    result.maintenanceTasks = result.maintenanceTasks.filter(keep);
  }

  return result;
};
