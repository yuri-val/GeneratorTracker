import {
  collection,
  collectionGroup,
  doc,
  getDocsFromServer,
  query,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
  DocumentData,
  DocumentReference,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { ChildEntityType, EntityType, LocalData, SyncEntity, Tombstone } from '../models/types';
import { toIsoTimestamp } from '../utils/syncMeta';

/**
 * Firestore access for the sync service.
 *
 * Structure: users/{uid}/generators/{generatorId}/{workSessions|refills|maintenanceTasks}/{id}
 *
 * - Documents are written with a full `set` (no merge), so a field cleared on the device
 *   (notes, model, end time, an interval) is cleared in the cloud too.
 * - `lastModified` is the client's ISO time and is never replaced by the server; the
 *   server time goes to a separate `serverUpdatedAt` field.
 * - Reads for reconciliation use `getDocsFromServer`: an offline client must fail rather
 *   than return an empty cache that would look like "everything was deleted".
 * - Every network call is bounded by a timeout so a hung request cannot block sync forever.
 */

export const CHILD_COLLECTIONS: Record<ChildEntityType, string> = {
  workSession: 'workSessions',
  refill: 'refills',
  maintenance: 'maintenanceTasks',
};
export const CHILD_TYPES: ChildEntityType[] = ['workSession', 'refill', 'maintenance'];

/** Firestore allows 500 writes per batch; stay below it. */
export const BATCH_LIMIT = 450;
export const NETWORK_TIMEOUT_MS = 30_000;

const LOCAL_ONLY_FIELDS = new Set(['syncStatus', 'syncedAt']);
const REMOTE_ONLY_FIELDS = new Set(['serverUpdatedAt']);

export class SyncTimeoutError extends Error {
  constructor(operation: string) {
    super(`${operation} timed out — check the internet connection`);
    this.name = 'SyncTimeoutError';
  }
}

export const withTimeout = <T>(promise: Promise<T>, operation: string, ms = NETWORK_TIMEOUT_MS): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new SyncTimeoutError(operation)), ms);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

// ============= References =============

export const generatorsCollectionRef = (uid: string) => collection(db, 'users', uid, 'generators');

export const childCollectionGroupQuery = (entityType: ChildEntityType, uid: string) =>
  query(collectionGroup(db, CHILD_COLLECTIONS[entityType]), where('userId', '==', uid));

const generatorDocRef = (uid: string, generatorId: string) => doc(db, 'users', uid, 'generators', generatorId);

const childDocRef = (uid: string, entityType: ChildEntityType, generatorId: string, id: string) =>
  doc(db, 'users', uid, 'generators', generatorId, CHILD_COLLECTIONS[entityType], id);

const entityDocRef = (uid: string, entityType: EntityType, entity: SyncEntity): DocumentReference => {
  if (entityType === 'generator') return generatorDocRef(uid, entity.id);
  const generatorId = (entity as { generatorId?: string }).generatorId;
  if (!generatorId) throw new Error(`${entityType} ${entity.id} has no generatorId`);
  return childDocRef(uid, entityType, generatorId, entity.id);
};

// ============= Conversion =============

/** Local record → Firestore document. */
export const toFirestoreDoc = (entity: SyncEntity, uid: string): DocumentData => {
  const data: DocumentData = {};
  for (const [key, value] of Object.entries(entity)) {
    if (value === undefined || LOCAL_ONLY_FIELDS.has(key)) continue;
    data[key] = value;
  }
  data.userId = uid;
  data.lastModified = toIsoTimestamp(entity.lastModified);
  data.serverUpdatedAt = serverTimestamp();
  return data;
};

/**
 * Firestore document → local record shape. Converts Timestamps to ISO strings,
 * including the server-time `lastModified` written by app versions before 2.4.2.
 */
export const fromFirestoreDoc = <T extends SyncEntity>(data: DocumentData, docId: string): T => {
  const record: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (REMOTE_ONLY_FIELDS.has(key)) continue;
    record[key] = value instanceof Timestamp ? value.toDate().toISOString() : value;
  }
  if (typeof record.id !== 'string' || !record.id) record.id = docId;
  record.lastModified = toIsoTimestamp(data.lastModified);
  return record as unknown as T;
};

// ============= Reads =============

export interface RemoteSnapshot {
  data: LocalData;
  /** Taken before the first request; used to avoid pruning records synced meanwhile. */
  fetchedAt: string;
}

/**
 * Fetch everything the user has in the cloud. Children are read *before* generators:
 * pushes write a generator before its children and deletes remove children before the
 * generator, so a child seen here always has its generator in the later read unless the
 * generator was really deleted.
 */
export const fetchAllRemoteData = async (uid: string): Promise<RemoteSnapshot> => {
  const fetchedAt = new Date().toISOString();

  const [sessions, refills, tasks] = await withTimeout(
    Promise.all(CHILD_TYPES.map(type => getDocsFromServer(childCollectionGroupQuery(type, uid)))),
    'Downloading records'
  );
  const generators = await withTimeout(getDocsFromServer(generatorsCollectionRef(uid)), 'Downloading generators');

  return {
    fetchedAt,
    data: {
      generators: generators.docs.map(d => fromFirestoreDoc(d.data(), d.id)),
      workSessions: sessions.docs.map(d => fromFirestoreDoc(d.data(), d.id)),
      refills: refills.docs.map(d => fromFirestoreDoc(d.data(), d.id)),
      maintenanceTasks: tasks.docs.map(d => fromFirestoreDoc(d.data(), d.id)),
    },
  };
};

// ============= Writes =============

export interface EntityWrite {
  entityType: EntityType;
  entity: SyncEntity;
}

export interface BatchResult<T> {
  /** Items whose batch was committed. */
  done: T[];
  /** First failure; later batches are not attempted. */
  error?: Error;
}

const commitInBatches = async <T>(
  items: T[],
  opsFor: (item: T) => Array<(batch: ReturnType<typeof writeBatch>) => void>,
  operation: string
): Promise<BatchResult<T>> => {
  const done: T[] = [];
  let batch = writeBatch(db);
  let batchItems: T[] = [];
  let opCount = 0;

  const commit = async () => {
    if (opCount === 0) return;
    await withTimeout(batch.commit(), operation);
    done.push(...batchItems);
    batch = writeBatch(db);
    batchItems = [];
    opCount = 0;
  };

  try {
    for (const item of items) {
      const ops = opsFor(item);
      // An item's operations may span batches (a generator with many children); the
      // item only counts as done once its last operation is committed.
      for (let i = 0; i < ops.length; i++) {
        if (opCount >= BATCH_LIMIT) {
          const pending = batchItems;
          batchItems = [];
          await withTimeout(batch.commit(), operation);
          done.push(...pending);
          batch = writeBatch(db);
          opCount = 0;
        }
        ops[i](batch);
        opCount++;
      }
      batchItems.push(item);
    }
    await commit();
    return { done };
  } catch (error) {
    return { done, error: error instanceof Error ? error : new Error(String(error)) };
  }
};

/** Upload records (full overwrite). Callers must pass generators before their children. */
export const writeEntities = (uid: string, writes: EntityWrite[]): Promise<BatchResult<EntityWrite>> =>
  commitInBatches(
    writes,
    write => {
      const ref = entityDocRef(uid, write.entityType, write.entity);
      const data = toFirestoreDoc(write.entity, uid);
      return [batch => batch.set(ref, data)];
    },
    'Uploading changes'
  );

/**
 * Apply local deletions to the cloud. A generator is deleted together with all of its
 * subcollection documents (children first, generator document last).
 */
export const deleteRemoteEntities = async (
  uid: string,
  tombstones: Tombstone[]
): Promise<BatchResult<Tombstone>> => {
  const plans = new Map<string, DocumentReference[]>();
  const done: Tombstone[] = [];
  const deletable: Tombstone[] = [];

  try {
    for (const tombstone of tombstones) {
      if (tombstone.entityType === 'generator') {
        const children = await withTimeout(
          Promise.all(
            CHILD_TYPES.map(type =>
              getDocsFromServer(collection(db, 'users', uid, 'generators', tombstone.entityId, CHILD_COLLECTIONS[type]))
            )
          ),
          'Preparing deletion'
        );
        const refs = children.flatMap(snapshot => snapshot.docs.map(d => d.ref));
        plans.set(tombstone.key, [...refs, generatorDocRef(uid, tombstone.entityId)]);
        deletable.push(tombstone);
      } else if (tombstone.generatorId) {
        plans.set(tombstone.key, [childDocRef(uid, tombstone.entityType, tombstone.generatorId, tombstone.entityId)]);
        deletable.push(tombstone);
      } else {
        // Cannot address the document without its generator; nothing more can be done.
        console.warn(`Dropping tombstone without generatorId: ${tombstone.key}`);
        done.push(tombstone);
      }
    }
  } catch (error) {
    return { done, error: error instanceof Error ? error : new Error(String(error)) };
  }

  // Child deletions first, generators (with their cascades) after.
  const ordered = [
    ...deletable.filter(t => t.entityType !== 'generator'),
    ...deletable.filter(t => t.entityType === 'generator'),
  ];
  const result = await commitInBatches(
    ordered,
    tombstone => (plans.get(tombstone.key) ?? []).map(ref => (batch: ReturnType<typeof writeBatch>) => batch.delete(ref)),
    'Deleting records'
  );
  return { done: [...done, ...result.done], error: result.error };
};

/**
 * Delete everything the user owns in the cloud (account deletion). Children are found
 * with the collection-group queries, so records orphaned by app versions before 2.4.2
 * (children whose generator document is gone) are removed too. Children first,
 * generators last; throws if any batch fails (already-deleted documents stay deleted,
 * a retry deletes the rest).
 */
export const deleteAllRemoteData = async (uid: string): Promise<number> => {
  const children = await withTimeout(
    Promise.all(CHILD_TYPES.map(type => getDocsFromServer(childCollectionGroupQuery(type, uid)))),
    'Preparing account deletion'
  );
  const generators = await withTimeout(getDocsFromServer(generatorsCollectionRef(uid)), 'Preparing account deletion');
  const refs = [...children.flatMap(snapshot => snapshot.docs.map(d => d.ref)), ...generators.docs.map(d => d.ref)];
  const result = await commitInBatches(refs, ref => [batch => batch.delete(ref)], 'Deleting account data');
  if (result.error) throw result.error;
  return refs.length;
};
