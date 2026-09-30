import AsyncStorage from '@react-native-async-storage/async-storage';
import { onSnapshot } from 'firebase/firestore';
import { Generator, WorkSession, Refill, MaintenanceTask } from '../../models/types';

// The sync service is exercised against the in-memory AsyncStorage mock; every
// Firestore call is stubbed so no network is involved.
jest.mock('firebase/firestore', () => ({
  onSnapshot: jest.fn(),
  collection: jest.fn(() => 'collection-ref'),
  collectionGroup: jest.fn(() => 'collection-group-ref'),
  query: jest.fn(() => 'query-ref'),
  where: jest.fn(() => 'where-clause'),
}));

jest.mock('../firestore', () => ({
  saveGeneratorToFirestore: jest.fn(),
  getAllGeneratorsFromFirestore: jest.fn(),
  saveWorkSessionToFirestore: jest.fn(),
  getAllWorkSessionsFromFirestore: jest.fn(),
  saveRefillToFirestore: jest.fn(),
  getAllRefillsFromFirestore: jest.fn(),
  saveMaintenanceTaskToFirestore: jest.fn(),
  getAllMaintenanceTasksFromFirestore: jest.fn(),
  deleteGeneratorFromFirestore: jest.fn(),
  deleteWorkSessionFromFirestore: jest.fn(),
  deleteRefillFromFirestore: jest.fn(),
  deleteMaintenanceTaskFromFirestore: jest.fn(),
}));

// Storage queues changes only for a signed-in user.
jest.mock('../auth', () => ({
  getCurrentUser: () => ({ uid: 'u1' }),
}));

import * as firestore from '../firestore';
import {
  processSyncQueue,
  performManualSync,
  performInitialSync,
  startRealtimeListeners,
  stopRealtimeListeners,
  getSyncStatus,
} from '../sync';
import {
  getGenerators,
  saveGenerator,
  getWorkSessions,
  saveWorkSession,
  deleteWorkSession,
  saveRefill,
  saveMaintenanceTask,
} from '../../utils/storage';
import { syncQueue } from '../../utils/syncQueue';

const mocked = firestore as jest.Mocked<typeof firestore>;
const onSnapshotMock = onSnapshot as unknown as jest.Mock;

const OLD = '2026-06-01T00:00:00.000Z';
const NEW = '2026-06-02T00:00:00.000Z';

const makeGenerator = (overrides: Partial<Generator> = {}): Generator => ({
  id: 'g1',
  name: 'Honda',
  purchaseDate: '2026-01-01',
  createdAt: OLD,
  lastModified: OLD,
  syncStatus: 'synced',
  ...overrides,
});

const makeSession = (overrides: Partial<WorkSession> = {}): WorkSession => ({
  id: 's1',
  generatorId: 'g1',
  date: '2026-06-01',
  startTime: '09:00',
  endTime: '11:00',
  hours: 2,
  createdAt: OLD,
  lastModified: OLD,
  syncStatus: 'synced',
  ...overrides,
});

const makeRefill = (overrides: Partial<Refill> = {}): Refill => ({
  id: 'r1',
  generatorId: 'g1',
  date: '2026-06-01',
  amount: 5,
  createdAt: OLD,
  lastModified: OLD,
  syncStatus: 'synced',
  ...overrides,
});

const makeTask = (overrides: Partial<MaintenanceTask> = {}): MaintenanceTask => ({
  id: 'm1',
  generatorId: 'g1',
  title: 'Oil change',
  intervalHours: 250,
  lastServiceHours: 0,
  lastServiceDate: '2026-01-01',
  createdAt: OLD,
  lastModified: OLD,
  syncStatus: 'synced',
  ...overrides,
});

let errorSpy: jest.SpyInstance;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  // The ESM namespace also carries `__esModule`; only reset real mock functions.
  for (const fn of Object.values(mocked)) {
    if (jest.isMockFunction(fn)) fn.mockReset();
  }
  mocked.getAllGeneratorsFromFirestore.mockResolvedValue([]);
  mocked.getAllWorkSessionsFromFirestore.mockResolvedValue([]);
  mocked.getAllRefillsFromFirestore.mockResolvedValue([]);
  mocked.getAllMaintenanceTasksFromFirestore.mockResolvedValue([]);
  onSnapshotMock.mockReturnValue(jest.fn());
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  stopRealtimeListeners();
  errorSpy.mockRestore();
});

describe('processSyncQueue', () => {
  it('pushes creates/updates, deletes with the parent generator, and empties the queue', async () => {
    await saveGenerator(makeGenerator({ syncStatus: 'pending' }));
    await saveWorkSession(makeSession({ syncStatus: 'pending' }));
    await deleteWorkSession('s1');

    await processSyncQueue('u1');

    expect(mocked.saveGeneratorToFirestore).toHaveBeenCalledWith(expect.objectContaining({ id: 'g1' }), 'u1');
    expect(mocked.saveWorkSessionToFirestore).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }), 'u1');
    expect(mocked.deleteWorkSessionFromFirestore).toHaveBeenCalledWith('u1', 'g1', 's1');
    expect(await syncQueue.getPendingCount()).toBe(0);
  });

  it('keeps a failed item and increments its retry count', async () => {
    mocked.saveGeneratorToFirestore.mockRejectedValueOnce(new Error('offline'));
    await saveGenerator(makeGenerator({ syncStatus: 'pending' }));

    await processSyncQueue('u1');

    const queue = await syncQueue.getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].retryCount).toBe(1);
  });

  it('routes every entity type to its own Firestore writer', async () => {
    await saveRefill(makeRefill({ syncStatus: 'pending' }));
    await saveMaintenanceTask(makeTask({ syncStatus: 'pending' }));

    await processSyncQueue('u1');

    expect(mocked.saveRefillToFirestore).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }), 'u1');
    expect(mocked.saveMaintenanceTaskToFirestore).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }), 'u1');
  });
});

describe('performManualSync (pull + last-write-wins)', () => {
  it('lets a newer remote record replace the local one', async () => {
    await saveGenerator(makeGenerator({ name: 'Local', lastModified: OLD }));
    mocked.getAllGeneratorsFromFirestore.mockResolvedValue([makeGenerator({ name: 'Remote', lastModified: NEW })]);

    await performManualSync('u1');

    const [generator] = await getGenerators();
    expect(generator.name).toBe('Remote');
    expect(generator.syncStatus).toBe('synced');
    expect(generator.syncedAt).toBeDefined();
    expect(getSyncStatus()).toBe('synced');
  });

  it('keeps a newer local record over an older remote one', async () => {
    await saveGenerator(makeGenerator({ name: 'Local', lastModified: NEW }));
    mocked.getAllGeneratorsFromFirestore.mockResolvedValue([makeGenerator({ name: 'Remote', lastModified: OLD })]);

    await performManualSync('u1');

    const [generator] = await getGenerators();
    expect(generator.name).toBe('Local');
  });

  it('adds records that only exist remotely, for every entity type', async () => {
    mocked.getAllGeneratorsFromFirestore.mockResolvedValue([makeGenerator()]);
    mocked.getAllWorkSessionsFromFirestore.mockResolvedValue([makeSession()]);

    await performManualSync('u1');

    expect((await getGenerators()).map(g => g.id)).toEqual(['g1']);
    expect((await getWorkSessions()).map(s => s.id)).toEqual(['s1']);
    // Pulled records must not be re-queued for upload.
    expect(await syncQueue.getPendingCount()).toBe(0);
  });

  it('flags an error status and rethrows when the pull fails', async () => {
    mocked.getAllGeneratorsFromFirestore.mockRejectedValue(new Error('permission-denied'));

    await expect(performManualSync('u1')).rejects.toThrow('permission-denied');
    expect(getSyncStatus()).toBe('error');
  });
});

describe('performInitialSync', () => {
  it('uploads every local entity tagged with the user id, pulls, and starts listeners', async () => {
    await saveGenerator(makeGenerator());
    await saveWorkSession(makeSession());
    await saveRefill(makeRefill());
    await saveMaintenanceTask(makeTask());

    await performInitialSync('u1');

    expect(mocked.saveGeneratorToFirestore).toHaveBeenCalledWith(expect.objectContaining({ id: 'g1', userId: 'u1' }), 'u1');
    expect(mocked.saveWorkSessionToFirestore).toHaveBeenCalledWith(expect.objectContaining({ id: 's1', userId: 'u1' }), 'u1');
    expect(mocked.saveRefillToFirestore).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1', userId: 'u1' }), 'u1');
    expect(mocked.saveMaintenanceTaskToFirestore).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1', userId: 'u1' }), 'u1');
    expect(mocked.getAllGeneratorsFromFirestore).toHaveBeenCalledWith('u1');
    expect(onSnapshotMock).toHaveBeenCalledTimes(4);
    expect(getSyncStatus()).toBe('synced');
  });
});

describe('realtime listeners', () => {
  it('subscribes to all four collections and unsubscribes on stop', () => {
    const unsubscribe = jest.fn();
    onSnapshotMock.mockReturnValue(unsubscribe);

    startRealtimeListeners('u1');
    expect(onSnapshotMock).toHaveBeenCalledTimes(4);

    stopRealtimeListeners();
    expect(unsubscribe).toHaveBeenCalledTimes(4);
  });

  it('stores added/modified remote documents locally as synced, without re-queueing', async () => {
    startRealtimeListeners('u1');
    const generatorsHandler = onSnapshotMock.mock.calls[0][1];

    await generatorsHandler({
      docChanges: () => [{ type: 'added', doc: { data: () => makeGenerator({ name: 'From cloud' }) } }],
    });

    const [generator] = await getGenerators();
    expect(generator).toMatchObject({ name: 'From cloud', syncStatus: 'synced' });
    expect(await syncQueue.getPendingCount()).toBe(0);
  });

  it('applies conflict resolution to modified documents', async () => {
    await saveGenerator(makeGenerator({ name: 'Local newer', lastModified: NEW }));
    startRealtimeListeners('u1');
    const generatorsHandler = onSnapshotMock.mock.calls[0][1];

    await generatorsHandler({
      docChanges: () => [{ type: 'modified', doc: { data: () => makeGenerator({ name: 'Remote older', lastModified: OLD }) } }],
    });

    expect((await getGenerators())[0].name).toBe('Local newer');
  });
});
