import AsyncStorage from '@react-native-async-storage/async-storage';
import { onSnapshot } from 'firebase/firestore';
import { Generator, WorkSession, Refill, MaintenanceTask, LocalData } from '../../models/types';

// The real storage layer runs against the in-memory AsyncStorage mock; only the
// network edge (firestore.ts I/O and onSnapshot) is replaced.
jest.mock('firebase/firestore', () => ({
  onSnapshot: jest.fn(),
  Timestamp: class Timestamp {},
}));

jest.mock('../firestore', () => ({
  ...jest.requireActual('../firestore'),
  fetchAllRemoteData: jest.fn(),
  writeEntities: jest.fn(),
  deleteRemoteEntities: jest.fn(),
  generatorsCollectionRef: jest.fn(() => 'generators-ref'),
  childCollectionGroupQuery: jest.fn((type: string) => `group-${type}`),
}));

import * as firestore from '../firestore';
import {
  performFullSync,
  performInitialSync,
  startRealtimeListeners,
  stopRealtimeListeners,
  getSyncStatus,
  SyncError,
} from '../sync';
import {
  getGenerators,
  saveGenerator,
  deleteGenerator,
  getWorkSessions,
  saveWorkSession,
  getRefills,
  saveRefill,
  saveMaintenanceTask,
  getTombstones,
  updateLocalData,
  getPendingChangesCount,
} from '../../utils/storage';

const mocked = firestore as jest.Mocked<typeof firestore>;
const onSnapshotMock = onSnapshot as unknown as jest.Mock;

const T1 = '2026-06-01T00:00:00.000Z';
const T2 = '2099-06-02T00:00:00.000Z'; // newer than any local edit made during the test

const gen = (id: string, overrides: Partial<Generator> = {}): Generator => ({
  id,
  name: id,
  purchaseDate: '2026-01-01',
  createdAt: T1,
  lastModified: T1,
  syncStatus: 'synced',
  syncedAt: T1,
  userId: 'u1',
  ...overrides,
});

const session = (id: string, generatorId = 'g1', overrides: Partial<WorkSession> = {}): WorkSession => ({
  id,
  generatorId,
  date: '2026-06-01',
  startTime: '09:00',
  endTime: '11:00',
  hours: 2,
  createdAt: T1,
  lastModified: T1,
  syncStatus: 'synced',
  syncedAt: T1,
  userId: 'u1',
  ...overrides,
});

const refill = (id: string, generatorId = 'g1'): Refill => ({
  id,
  generatorId,
  date: '2026-06-01',
  amount: 5,
  createdAt: T1,
  lastModified: T1,
  syncStatus: 'pending',
});

const task = (id: string, generatorId = 'g1'): MaintenanceTask => ({
  id,
  generatorId,
  title: 'Oil',
  intervalHours: 250,
  lastServiceHours: 0,
  lastServiceDate: '2026-01-01',
  createdAt: T1,
  lastModified: T1,
  syncStatus: 'pending',
});

const remoteData = (data: Partial<LocalData> = {}): LocalData => ({
  generators: [],
  workSessions: [],
  refills: [],
  maintenanceTasks: [],
  ...data,
});

const setRemote = (data: Partial<LocalData>) =>
  mocked.fetchAllRemoteData.mockResolvedValue({ data: remoteData(data), fetchedAt: new Date().toISOString() });

const seedLocal = (data: Partial<LocalData>) => updateLocalData(() => data);

/** Wait until every queued storage write (e.g. from a listener callback) has finished. */
const flushStorage = () => updateLocalData(() => undefined);

let errorSpy: jest.SpyInstance;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mocked.writeEntities.mockImplementation(async (_uid, writes) => ({ done: writes }));
  mocked.deleteRemoteEntities.mockImplementation(async (_uid, tombstones) => ({ done: tombstones }));
  setRemote({});
  onSnapshotMock.mockReturnValue(jest.fn());
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  stopRealtimeListeners();
  errorSpy.mockRestore();
});

describe('push', () => {
  it('uploads pending records — generators first — and marks them synced', async () => {
    await saveGenerator(gen('g1'));
    await saveWorkSession(session('s1'));
    await saveRefill(refill('r1'));
    await saveMaintenanceTask(task('m1'));
    setRemote({}); // pull sees nothing yet; freshly pushed records must survive it

    await performFullSync('u1');

    const [generatorCall, childCall] = mocked.writeEntities.mock.calls;
    expect(generatorCall[1].map(w => w.entity.id)).toEqual(['g1']);
    expect(childCall[1].map(w => `${w.entityType}:${w.entity.id}`)).toEqual(['workSession:s1', 'refill:r1', 'maintenance:m1']);
    expect((await getGenerators())[0]).toMatchObject({ syncStatus: 'synced', userId: 'u1' });
    expect(await getPendingChangesCount()).toBe(0);
    expect(getSyncStatus()).toBe('synced');

    mocked.writeEntities.mockClear();
    await performFullSync('u1');
    expect(mocked.writeEntities).not.toHaveBeenCalled();
  });

  it('keeps children of a generator that failed to upload local and pending (no orphans)', async () => {
    await saveGenerator(gen('g1'));
    await saveWorkSession(session('s1'));
    mocked.writeEntities.mockImplementationOnce(async () => ({ done: [], error: new Error('offline') }));

    await expect(performFullSync('u1')).rejects.toBeInstanceOf(SyncError);

    expect(mocked.writeEntities).toHaveBeenCalledTimes(1); // the child write was not attempted
    expect((await getWorkSessions())[0].syncStatus).toBe('pending');
    expect((await getGenerators())[0].syncStatus).toBe('pending');
    expect(getSyncStatus()).toBe('error');
    expect(mocked.fetchAllRemoteData).toHaveBeenCalled(); // pull still ran
  });

  it('uploads children of an already synced generator', async () => {
    await seedLocal({ generators: [gen('g1')] });
    await saveWorkSession(session('s1'));

    await performFullSync('u1');

    expect(mocked.writeEntities).toHaveBeenCalledTimes(1);
    expect(mocked.writeEntities.mock.calls[0][1].map(w => w.entity.id)).toEqual(['s1']);
  });

  it('leaves a record pending when it is edited while its upload is in flight', async () => {
    await saveGenerator(gen('g1', { name: 'v1' }));
    mocked.writeEntities.mockImplementationOnce(async (_uid, writes) => {
      await saveGenerator(gen('g1', { name: 'v2' }));
      return { done: writes };
    });

    await performFullSync('u1');

    expect((await getGenerators())[0]).toMatchObject({ name: 'v2', syncStatus: 'pending' });
  });

  it('never runs two syncs at the same time', async () => {
    let active = 0;
    let maxActive = 0;
    mocked.fetchAllRemoteData.mockImplementation(async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise(resolve => setTimeout(resolve, 5));
      active--;
      return { data: remoteData(), fetchedAt: new Date().toISOString() };
    });

    await Promise.all([performFullSync('u1'), performFullSync('u1'), performFullSync('u1')]);

    expect(maxActive).toBe(1);
    expect(mocked.fetchAllRemoteData).toHaveBeenCalledTimes(3);
  });
});

describe('deletions (S-2)', () => {
  it('pushes a deletion made while signed out before pulling, so it is never resurrected', async () => {
    await seedLocal({ generators: [gen('g1')], workSessions: [session('s1')] });
    await deleteGenerator('g1'); // no user signed in: only a tombstone is recorded
    setRemote({});

    await performFullSync('u1');

    expect(mocked.deleteRemoteEntities).toHaveBeenCalledWith('u1', [expect.objectContaining({ key: 'generator:g1' })]);
    expect(mocked.deleteRemoteEntities.mock.invocationCallOrder[0]).toBeLessThan(
      mocked.fetchAllRemoteData.mock.invocationCallOrder[0]
    );
    expect(await getTombstones()).toEqual([]);
    expect(await getGenerators()).toEqual([]);
    expect(await getWorkSessions()).toEqual([]);
  });

  it('keeps the tombstone and still hides the record when the cloud deletion fails', async () => {
    await seedLocal({ generators: [gen('g1')] });
    await deleteGenerator('g1');
    mocked.deleteRemoteEntities.mockResolvedValueOnce({ done: [], error: new Error('offline') });
    setRemote({ generators: [gen('g1')] });

    await expect(performFullSync('u1')).rejects.toThrow('offline');

    expect((await getTombstones()).map(t => t.key)).toEqual(['generator:g1']);
    expect(await getGenerators()).toEqual([]);
  });

  it('removes local records that were deleted on another device', async () => {
    await seedLocal({ generators: [gen('g1'), gen('g2')], workSessions: [session('s1', 'g1'), session('s2', 'g2')] });
    setRemote({ generators: [gen('g2')], workSessions: [session('s2', 'g2')] });

    await performFullSync('u1');

    expect((await getGenerators()).map(g => g.id)).toEqual(['g2']);
    expect((await getWorkSessions()).map(s => s.id)).toEqual(['s2']);
  });
});

describe('pull', () => {
  it('applies newer remote versions and ignores orphans left in the cloud (S-1, S-3)', async () => {
    await seedLocal({ generators: [gen('g1', { name: 'Local' })] });
    setRemote({
      generators: [gen('g1', { name: 'Remote', lastModified: T2 })],
      workSessions: [session('s1', 'g1'), session('orphan', 'deleted-generator')],
    });

    await performFullSync('u1');

    expect((await getGenerators())[0].name).toBe('Remote');
    expect((await getWorkSessions()).map(s => s.id)).toEqual(['s1']);
  });

  it('flags an error and rethrows when downloading fails', async () => {
    mocked.fetchAllRemoteData.mockRejectedValue(new Error('permission-denied'));

    await expect(performFullSync('u1')).rejects.toThrow('permission-denied');
    expect(getSyncStatus()).toBe('error');
  });
});

describe('performInitialSync', () => {
  it('syncs, then starts one listener per collection', async () => {
    await saveGenerator(gen('g1'));

    await performInitialSync('u1');

    expect(mocked.writeEntities).toHaveBeenCalled();
    expect(onSnapshotMock).toHaveBeenCalledTimes(4);
  });
});

// ============= Realtime listeners =============

type FakeDoc = { id: string; data: Record<string, unknown>; pending?: boolean };
type FakeChange = FakeDoc & { type: 'added' | 'modified' | 'removed' };

const snapshot = (docs: FakeDoc[], changes: FakeChange[] = [], fromCache = false) => ({
  metadata: { fromCache },
  docs: docs.map(d => ({ id: d.id, data: () => d.data, metadata: { hasPendingWrites: !!d.pending } })),
  docChanges: () =>
    changes.map(c => ({ type: c.type, doc: { id: c.id, data: () => c.data, metadata: { hasPendingWrites: !!c.pending } } })),
});

const handlerFor = (index: number) => onSnapshotMock.mock.calls[index][1];
const GENERATORS = 0;
const SESSIONS = 1;
const REFILLS = 2;

const asRemote = (record: object): FakeDoc => {
  const { syncStatus: _s, syncedAt: _a, ...data } = record as Record<string, unknown>;
  return { id: data.id as string, data };
};

describe('realtime listeners', () => {
  it('subscribes to all collections and unsubscribes on stop', () => {
    const unsubscribe = jest.fn();
    onSnapshotMock.mockReturnValue(unsubscribe);

    startRealtimeListeners('u1');
    expect(onSnapshotMock.mock.calls.map(c => c[0])).toEqual([
      'generators-ref',
      'group-workSession',
      'group-refill',
      'group-maintenance',
    ]);

    stopRealtimeListeners();
    expect(unsubscribe).toHaveBeenCalledTimes(4);
  });

  it('reconciles on the first server snapshot: removes what was deleted while offline', async () => {
    await seedLocal({ generators: [gen('g1'), gen('g2')], workSessions: [session('s1', 'g1')] });
    startRealtimeListeners('u1');

    handlerFor(GENERATORS)(snapshot([asRemote(gen('g2'))]));
    await flushStorage();

    expect((await getGenerators()).map(g => g.id)).toEqual(['g2']);
    expect(await getWorkSessions()).toEqual([]); // cascaded with g1
  });

  it('never prunes on a cache-only snapshot (offline start)', async () => {
    await seedLocal({ generators: [gen('g1')] });
    startRealtimeListeners('u1');

    handlerFor(GENERATORS)(snapshot([], [], true));
    await flushStorage();

    expect((await getGenerators()).map(g => g.id)).toEqual(['g1']);
  });

  it('applies later added/modified/removed changes incrementally', async () => {
    await seedLocal({ generators: [gen('g1')], refills: [{ ...refill('r1'), syncStatus: 'synced', syncedAt: T1, userId: 'u1' }] });
    startRealtimeListeners('u1');
    handlerFor(GENERATORS)(snapshot([asRemote(gen('g1'))]));
    handlerFor(REFILLS)(snapshot([asRemote({ ...refill('r1'), userId: 'u1' })]));

    handlerFor(GENERATORS)(
      snapshot([], [
        { type: 'modified', ...asRemote(gen('g1', { name: 'Renamed', lastModified: T2 })) },
        { type: 'added', ...asRemote(gen('g3')) },
      ])
    );
    handlerFor(REFILLS)(snapshot([], [{ type: 'removed', ...asRemote(refill('r1')) }]));
    await flushStorage();

    expect((await getGenerators()).map(g => `${g.id}:${g.name}`)).toEqual(['g1:Renamed', 'g3:g3']);
    expect(await getRefills()).toEqual([]);
    expect(await getPendingChangesCount()).toBe(0);
  });

  it("skips documents with pending writes (this device's own unacknowledged writes)", async () => {
    await saveGenerator(gen('g1', { name: 'Local', syncStatus: 'pending' }));
    startRealtimeListeners('u1');

    handlerFor(GENERATORS)(snapshot([{ ...asRemote(gen('g1', { name: 'Local' })), pending: true }]));
    handlerFor(SESSIONS)(snapshot([], [{ type: 'added', ...asRemote(session('s9')), pending: true }]));
    await flushStorage();

    expect((await getGenerators())[0]).toMatchObject({ name: 'Local', syncStatus: 'pending' });
    expect(await getWorkSessions()).toEqual([]);
  });

  it('ignores callbacks from listeners that were stopped', async () => {
    startRealtimeListeners('u1');
    const staleHandler = handlerFor(GENERATORS);
    stopRealtimeListeners();

    staleHandler(snapshot([asRemote(gen('ghost'))]));
    await flushStorage();

    expect(await getGenerators()).toEqual([]);
  });

  it('reports listener failures through the sync status', () => {
    startRealtimeListeners('u1');
    const errorCallback = onSnapshotMock.mock.calls[GENERATORS][2];

    errorCallback(new Error('permission-denied'));

    expect(getSyncStatus()).toBe('error');
  });
});
