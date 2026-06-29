import { onSnapshot, collection, collectionGroup, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Generator, WorkSession, Refill, MaintenanceTask } from '../models/types';
import {
  saveGeneratorToFirestore,
  getAllGeneratorsFromFirestore,
  saveWorkSessionToFirestore,
  getAllWorkSessionsFromFirestore,
  saveRefillToFirestore,
  getAllRefillsFromFirestore,
  saveMaintenanceTaskToFirestore,
  getAllMaintenanceTasksFromFirestore,
  deleteGeneratorFromFirestore,
  deleteWorkSessionFromFirestore,
  deleteRefillFromFirestore,
  deleteMaintenanceTaskFromFirestore,
} from './firestore';
import {
  getGenerators,
  saveGenerator,
  getWorkSessions,
  saveWorkSession,
  getRefills,
  saveRefill,
  getMaintenanceTasks,
  saveMaintenanceTask,
} from '../utils/storage';
import { syncQueue } from '../utils/syncQueue';

/**
 * Sync Service
 * Orchestrates synchronization between local AsyncStorage and Firebase Firestore
 */

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';
type EntityType = 'generator' | 'workSession' | 'refill' | 'maintenance';

let syncStatus: SyncStatus = 'idle';
let listenerUnsubscribers: (() => void)[] = [];

/**
 * Get current sync status
 */
export const getSyncStatus = (): SyncStatus => {
  return syncStatus;
};

/**
 * Resolve conflict between local and remote data using last-write-wins strategy
 */
const resolveConflict = <T extends { lastModified: string }>(local: T, remote: T): T => {
  const localTime = new Date(local.lastModified).getTime();
  const remoteTime = new Date(remote.lastModified).getTime();

  // Last write wins
  return remoteTime > localTime ? remote : local;
};

/**
 * Push a single entity to Firestore
 */
export const pushEntityToFirestore = async (
  entityType: EntityType,
  data: any,
  userId: string
): Promise<void> => {
  try {
    switch (entityType) {
      case 'generator':
        await saveGeneratorToFirestore(data as Generator, userId);
        break;
      case 'workSession':
        await saveWorkSessionToFirestore(data as WorkSession, userId);
        break;
      case 'refill':
        await saveRefillToFirestore(data as Refill, userId);
        break;
      case 'maintenance':
        await saveMaintenanceTaskToFirestore(data as MaintenanceTask, userId);
        break;
    }
  } catch (error) {
    console.error(`Error pushing ${entityType} to Firestore:`, error);
    throw error;
  }
};

/**
 * Delete entity from Firestore
 */
export const deleteEntityFromFirestore = async (
  entityType: EntityType,
  entityId: string,
  generatorId: string | undefined,
  userId: string
): Promise<void> => {
  try {
    switch (entityType) {
      case 'generator':
        await deleteGeneratorFromFirestore(userId, entityId);
        break;
      case 'workSession':
        if (!generatorId) throw new Error('generatorId required for work session');
        await deleteWorkSessionFromFirestore(userId, generatorId, entityId);
        break;
      case 'refill':
        if (!generatorId) throw new Error('generatorId required for refill');
        await deleteRefillFromFirestore(userId, generatorId, entityId);
        break;
      case 'maintenance':
        if (!generatorId) throw new Error('generatorId required for maintenance task');
        await deleteMaintenanceTaskFromFirestore(userId, generatorId, entityId);
        break;
    }
  } catch (error) {
    console.error(`Error deleting ${entityType} from Firestore:`, error);
    throw error;
  }
};

/**
 * Process sync queue - push pending changes to Firestore
 */
export const processSyncQueue = async (userId: string): Promise<void> => {
  const queue = await syncQueue.getQueue();

  for (const item of queue) {
    try {
      if (item.operation === 'delete') {
        const generatorId = item.data?.generatorId;
        await deleteEntityFromFirestore(item.entityType, item.entityId, generatorId, userId);
      } else {
        // create or update
        await pushEntityToFirestore(item.entityType, item.data, userId);
      }

      // Remove from queue on success
      await syncQueue.removeFromQueue(item.id);
    } catch (error) {
      console.error('Error processing sync queue item:', error);

      // Update retry count
      if (item.retryCount < 3) {
        await syncQueue.updateQueueItem(item.id, {
          retryCount: item.retryCount + 1,
        });
      } else {
        // Max retries reached, remove from queue
        console.error('Max retries reached for sync item:', item);
        await syncQueue.removeFromQueue(item.id);
      }
    }
  }
};

/**
 * Perform initial sync on sign-in
 * Uploads all local data to Firestore and pulls remote data
 */
export const performInitialSync = async (userId: string): Promise<void> => {
  try {
    syncStatus = 'syncing';

    // 1. Push all local data to Firestore
    const localGenerators = await getGenerators();
    for (const gen of localGenerators) {
      const genWithUserId = { ...gen, userId };
      await saveGeneratorToFirestore(genWithUserId, userId);

      // Push related work sessions
      const sessions = (await getWorkSessions(gen.id)).filter(s => s.generatorId === gen.id);
      for (const session of sessions) {
        const sessionWithUserId = { ...session, userId };
        await saveWorkSessionToFirestore(sessionWithUserId, userId);
      }

      // Push related refills
      const refills = (await getRefills(gen.id)).filter(r => r.generatorId === gen.id);
      for (const refill of refills) {
        const refillWithUserId = { ...refill, userId };
        await saveRefillToFirestore(refillWithUserId, userId);
      }

      // Push related maintenance tasks
      const tasks = (await getMaintenanceTasks(gen.id)).filter(m => m.generatorId === gen.id);
      for (const task of tasks) {
        const taskWithUserId = { ...task, userId };
        await saveMaintenanceTaskToFirestore(taskWithUserId, userId);
      }
    }

    // 2. Pull remote data and merge with local
    await pullAllDataFromFirestore(userId);

    // 3. Process any queued operations
    await processSyncQueue(userId);

    // 4. Start real-time listeners
    startRealtimeListeners(userId);

    syncStatus = 'synced';
  } catch (error) {
    console.error('Initial sync error:', error);
    syncStatus = 'error';
    throw error;
  }
};

/**
 * Pull all data from Firestore and merge with local
 */
const pullAllDataFromFirestore = async (userId: string): Promise<void> => {
  try {
    // Pull generators
    const remoteGenerators = await getAllGeneratorsFromFirestore(userId);
    const localGenerators = await getGenerators();

    for (const remoteGen of remoteGenerators) {
      const localGen = localGenerators.find(g => g.id === remoteGen.id);

      if (localGen) {
        // Conflict resolution
        const resolved = resolveConflict(localGen, remoteGen);
        await saveGenerator({ ...resolved, syncStatus: 'synced', syncedAt: new Date().toISOString() });
      } else {
        // No local copy, just save remote
        await saveGenerator({ ...remoteGen, syncStatus: 'synced', syncedAt: new Date().toISOString() });
      }
    }

    // Pull all work sessions
    const remoteSessions = await getAllWorkSessionsFromFirestore(userId);
    const localSessions = await getWorkSessions();

    for (const remoteSession of remoteSessions) {
      const localSession = localSessions.find(s => s.id === remoteSession.id);

      if (localSession) {
        const resolved = resolveConflict(localSession, remoteSession);
        await saveWorkSession({ ...resolved, syncStatus: 'synced', syncedAt: new Date().toISOString() });
      } else {
        await saveWorkSession({ ...remoteSession, syncStatus: 'synced', syncedAt: new Date().toISOString() });
      }
    }

    // Pull all refills
    const remoteRefills = await getAllRefillsFromFirestore(userId);
    const localRefills = await getRefills();

    for (const remoteRefill of remoteRefills) {
      const localRefill = localRefills.find(r => r.id === remoteRefill.id);

      if (localRefill) {
        const resolved = resolveConflict(localRefill, remoteRefill);
        await saveRefill({ ...resolved, syncStatus: 'synced', syncedAt: new Date().toISOString() });
      } else {
        await saveRefill({ ...remoteRefill, syncStatus: 'synced', syncedAt: new Date().toISOString() });
      }
    }

    // Pull all maintenance tasks
    const remoteTasks = await getAllMaintenanceTasksFromFirestore(userId);
    const localTasks = await getMaintenanceTasks();

    for (const remoteTask of remoteTasks) {
      const localTask = localTasks.find(t => t.id === remoteTask.id);

      if (localTask) {
        const resolved = resolveConflict(localTask, remoteTask);
        await saveMaintenanceTask({ ...resolved, syncStatus: 'synced', syncedAt: new Date().toISOString() });
      } else {
        await saveMaintenanceTask({ ...remoteTask, syncStatus: 'synced', syncedAt: new Date().toISOString() });
      }
    }
  } catch (error) {
    console.error('Error pulling data from Firestore:', error);
    throw error;
  }
};

/**
 * Start real-time Firestore listeners for all collections
 */
export const startRealtimeListeners = (userId: string): void => {
  // Stop existing listeners first
  stopRealtimeListeners();

  // Listen to generators
  const generatorsRef = collection(db, `users/${userId}/generators`);
  const unsubGenerators = onSnapshot(generatorsRef, async (snapshot) => {
    for (const change of snapshot.docChanges()) {
      const remoteGen = change.doc.data() as Generator;

      if (change.type === 'added' || change.type === 'modified') {
        const localGenerators = await getGenerators();
        const localGen = localGenerators.find(g => g.id === remoteGen.id);

        if (localGen) {
          const resolved = resolveConflict(localGen, remoteGen);
          await saveGenerator({ ...resolved, syncStatus: 'synced', syncedAt: new Date().toISOString() });
        } else {
          await saveGenerator({ ...remoteGen, syncStatus: 'synced', syncedAt: new Date().toISOString() });
        }
      }
    }
  });

  // Listen to all work sessions using collection group
  const sessionsQuery = collectionGroup(db, 'workSessions');
  const sessionsUserQuery = query(sessionsQuery, where('userId', '==', userId));
  const unsubSessions = onSnapshot(sessionsUserQuery, async (snapshot) => {
    for (const change of snapshot.docChanges()) {
      const remoteSession = change.doc.data() as WorkSession;

      if (change.type === 'added' || change.type === 'modified') {
        const localSessions = await getWorkSessions();
        const localSession = localSessions.find(s => s.id === remoteSession.id);

        if (localSession) {
          const resolved = resolveConflict(localSession, remoteSession);
          await saveWorkSession({ ...resolved, syncStatus: 'synced', syncedAt: new Date().toISOString() });
        } else {
          await saveWorkSession({ ...remoteSession, syncStatus: 'synced', syncedAt: new Date().toISOString() });
        }
      }
    }
  });

  // Listen to all refills using collection group
  const refillsQuery = collectionGroup(db, 'refills');
  const refillsUserQuery = query(refillsQuery, where('userId', '==', userId));
  const unsubRefills = onSnapshot(refillsUserQuery, async (snapshot) => {
    for (const change of snapshot.docChanges()) {
      const remoteRefill = change.doc.data() as Refill;

      if (change.type === 'added' || change.type === 'modified') {
        const localRefills = await getRefills();
        const localRefill = localRefills.find(r => r.id === remoteRefill.id);

        if (localRefill) {
          const resolved = resolveConflict(localRefill, remoteRefill);
          await saveRefill({ ...resolved, syncStatus: 'synced', syncedAt: new Date().toISOString() });
        } else {
          await saveRefill({ ...remoteRefill, syncStatus: 'synced', syncedAt: new Date().toISOString() });
        }
      }
    }
  });

  // Listen to all maintenance tasks using collection group
  const tasksQuery = collectionGroup(db, 'maintenanceTasks');
  const tasksUserQuery = query(tasksQuery, where('userId', '==', userId));
  const unsubTasks = onSnapshot(tasksUserQuery, async (snapshot) => {
    for (const change of snapshot.docChanges()) {
      const remoteTask = change.doc.data() as MaintenanceTask;

      if (change.type === 'added' || change.type === 'modified') {
        const localTasks = await getMaintenanceTasks();
        const localTask = localTasks.find(t => t.id === remoteTask.id);

        if (localTask) {
          const resolved = resolveConflict(localTask, remoteTask);
          await saveMaintenanceTask({ ...resolved, syncStatus: 'synced', syncedAt: new Date().toISOString() });
        } else {
          await saveMaintenanceTask({ ...remoteTask, syncStatus: 'synced', syncedAt: new Date().toISOString() });
        }
      }
    }
  });

  // Store unsubscribers
  listenerUnsubscribers = [unsubGenerators, unsubSessions, unsubRefills, unsubTasks];
};

/**
 * Stop all real-time listeners
 */
export const stopRealtimeListeners = (): void => {
  listenerUnsubscribers.forEach(unsubscribe => unsubscribe());
  listenerUnsubscribers = [];
};

/**
 * Perform manual sync
 */
export const performManualSync = async (userId: string): Promise<void> => {
  try {
    syncStatus = 'syncing';

    // Process pending queue items
    await processSyncQueue(userId);

    // Pull latest from Firestore
    await pullAllDataFromFirestore(userId);

    syncStatus = 'synced';
  } catch (error) {
    console.error('Manual sync error:', error);
    syncStatus = 'error';
    throw error;
  }
};
