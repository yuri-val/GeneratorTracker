import AsyncStorage from '@react-native-async-storage/async-storage';
import { Generator, WorkSession, Refill, MaintenanceTask } from '../../models/types';
import {
  getGenerators,
  saveGenerator,
  deleteGenerator,
  getWorkSessions,
  saveWorkSession,
  deleteWorkSession,
  getActiveWorkSession,
  getRefills,
  saveRefill,
  deleteRefill,
  getMaintenanceTasks,
  saveMaintenanceTask,
  deleteMaintenanceTask,
  getSavedLanguage,
  saveLanguage,
  getLocalData,
  getTombstones,
  removeTombstones,
  markSynced,
  getPendingChangesCount,
  updateLocalData,
} from '../storage';

const OLD = '2026-06-01T00:00:00.000Z';

const makeGenerator = (overrides: Partial<Generator> = {}): Generator => ({
  id: 'g1',
  name: 'Honda',
  purchaseDate: '2026-01-01',
  createdAt: OLD,
  lastModified: OLD,
  syncStatus: 'pending',
  ...overrides,
});

const makeSession = (overrides: Partial<WorkSession> = {}): WorkSession => ({
  id: 's1',
  generatorId: 'g1',
  date: '2026-06-29',
  startTime: '09:00',
  endTime: '11:00',
  hours: 2,
  createdAt: OLD,
  lastModified: OLD,
  syncStatus: 'pending',
  ...overrides,
});

const makeRefill = (overrides: Partial<Refill> = {}): Refill => ({
  id: 'r1',
  generatorId: 'g1',
  date: '2026-06-29',
  amount: 5,
  createdAt: OLD,
  lastModified: OLD,
  syncStatus: 'pending',
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
  syncStatus: 'pending',
  ...overrides,
});

const seed = async (key: string, value: unknown) => AsyncStorage.setItem(key, JSON.stringify(value));

let errorSpy: jest.SpyInstance;

beforeEach(async () => {
  await AsyncStorage.clear();
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe('local saves', () => {
  it('creates, then updates in place by id', async () => {
    await saveGenerator(makeGenerator());
    await saveGenerator(makeGenerator({ id: 'g2', name: 'Second' }));
    await saveGenerator(makeGenerator({ name: 'Honda EU22' }));

    expect((await getGenerators()).map(g => g.name)).toEqual(['Honda EU22', 'Second']);
  });

  it('always marks a local edit pending, even if the caller passed "synced"', async () => {
    await saveGenerator(makeGenerator({ syncStatus: 'synced' }));
    expect((await getGenerators())[0].syncStatus).toBe('pending');
  });

  it('stamps a fresh lastModified that is strictly newer than the stored one', async () => {
    const future = '2099-01-01T00:00:00.000Z'; // e.g. written by a device with a fast clock
    await seed('@generators', [makeGenerator({ lastModified: future, syncStatus: 'synced' })]);

    await saveGenerator(makeGenerator({ name: 'Edited', lastModified: OLD }));

    const [saved] = await getGenerators();
    expect(Date.parse(saved.lastModified)).toBeGreaterThan(Date.parse(future));
  });

  it('keeps the cloud metadata of the stored version (syncedAt, userId)', async () => {
    await seed('@generators', [makeGenerator({ syncStatus: 'synced', syncedAt: OLD, userId: 'u1' })]);

    await saveGenerator(makeGenerator({ name: 'Edited' }));

    expect((await getGenerators())[0]).toMatchObject({ name: 'Edited', syncStatus: 'pending', syncedAt: OLD, userId: 'u1' });
  });

  it('does not lose writes that run concurrently (S-8)', async () => {
    await Promise.all([
      saveGenerator(makeGenerator({ id: 'a' })),
      saveGenerator(makeGenerator({ id: 'b' })),
      saveWorkSession(makeSession({ id: 's-a', generatorId: 'a' })),
      saveGenerator(makeGenerator({ id: 'c' })),
      deleteGenerator('b'),
      saveRefill(makeRefill({ id: 'r-c', generatorId: 'c' })),
    ]);

    expect((await getGenerators()).map(g => g.id).sort()).toEqual(['a', 'c']);
    expect((await getWorkSessions()).map(s => s.id)).toEqual(['s-a']);
    expect((await getRefills()).map(r => r.id)).toEqual(['r-c']);
  });
});

describe('deletes and tombstones', () => {
  it('cascades a generator delete locally and records a single tombstone', async () => {
    await saveGenerator(makeGenerator());
    await saveGenerator(makeGenerator({ id: 'g2', name: 'Keep me' }));
    await saveWorkSession(makeSession());
    await saveWorkSession(makeSession({ id: 's2', generatorId: 'g2' }));
    await saveRefill(makeRefill());
    await saveMaintenanceTask(makeTask());
    await deleteWorkSession('s1'); // child tombstone, superseded by the generator's

    await deleteGenerator('g1');

    expect((await getGenerators()).map(g => g.id)).toEqual(['g2']);
    expect((await getWorkSessions()).map(s => s.id)).toEqual(['s2']);
    expect(await getRefills()).toEqual([]);
    expect(await getMaintenanceTasks()).toEqual([]);
    const tombstones = await getTombstones();
    expect(tombstones).toHaveLength(1);
    expect(tombstones[0]).toMatchObject({ key: 'generator:g1', entityType: 'generator', entityId: 'g1' });
  });

  it('records child tombstones with their parent generator, whether signed in or not', async () => {
    await saveWorkSession(makeSession());
    await saveRefill(makeRefill());
    await saveMaintenanceTask(makeTask());

    await deleteWorkSession('s1');
    await deleteRefill('r1');
    await deleteMaintenanceTask('m1');

    expect((await getTombstones()).map(t => [t.key, t.generatorId])).toEqual([
      ['workSession:s1', 'g1'],
      ['refill:r1', 'g1'],
      ['maintenance:m1', 'g1'],
    ]);
  });

  it('ignores deletes of unknown ids', async () => {
    await deleteGenerator('missing');
    expect(await getTombstones()).toEqual([]);
  });

  it('removes tombstones once their deletion reached the cloud', async () => {
    await saveWorkSession(makeSession());
    await saveRefill(makeRefill());
    await deleteWorkSession('s1');
    await deleteRefill('r1');

    await removeTombstones(['workSession:s1']);

    expect((await getTombstones()).map(t => t.key)).toEqual(['refill:r1']);
  });
});

describe('markSynced', () => {
  it('marks the pushed version synced with the account and time', async () => {
    await saveGenerator(makeGenerator());
    const [pending] = await getGenerators();

    await markSynced([{ entityType: 'generator', id: 'g1', lastModified: pending.lastModified }], 'u1', OLD);

    expect((await getGenerators())[0]).toMatchObject({ syncStatus: 'synced', syncedAt: OLD, userId: 'u1' });
  });

  it('leaves a record pending if it was edited again after the push started', async () => {
    await saveGenerator(makeGenerator());
    const [pushed] = await getGenerators();
    await saveGenerator(makeGenerator({ name: 'Edited during push' }));

    await markSynced([{ entityType: 'generator', id: 'g1', lastModified: pushed.lastModified }], 'u1', OLD);

    expect((await getGenerators())[0]).toMatchObject({ name: 'Edited during push', syncStatus: 'pending' });
  });
});

describe('pending changes count', () => {
  it('counts pending records and tombstones', async () => {
    await seed('@generators', [makeGenerator({ syncStatus: 'synced' }), makeGenerator({ id: 'g2' })]);
    await seed('@work_sessions', [makeSession({ syncStatus: 'synced' })]);
    await deleteWorkSession('s1');

    expect(await getPendingChangesCount()).toBe(2); // g2 + the deletion
  });
});

describe('reading data written by older versions', () => {
  it('normalizes Firestore Timestamp objects stored as lastModified (S-1)', async () => {
    await seed('@generators', [
      makeGenerator({ lastModified: { seconds: 1780000000, nanoseconds: 500000000 } as unknown as string }),
    ]);

    const [generator] = await getGenerators();
    expect(generator.lastModified).toBe(new Date(1780000000500).toISOString());
  });

  it('treats records without a syncStatus as pending', async () => {
    const { syncStatus: _omit, ...legacy } = makeGenerator();
    await seed('@generators', [legacy]);

    expect((await getGenerators())[0].syncStatus).toBe('pending');
  });

  it('keeps a backup of unreadable data and carries on with an empty list', async () => {
    await AsyncStorage.setItem('@generators', '{not json');

    await expect(getGenerators()).resolves.toEqual([]);
    const keys = await AsyncStorage.getAllKeys();
    const backupKey = keys.find(k => k.startsWith('@generators.corrupt-'));
    expect(backupKey).toBeDefined();
    expect(await AsyncStorage.getItem(backupKey as string)).toBe('{not json');
  });

  it('migrates the pre-2.4.2 sync queue: deletes → tombstones, updates → pending', async () => {
    await seed('@generators', [makeGenerator({ syncStatus: 'synced', userId: 'u1' })]);
    await seed('@sync_queue', [
      { id: 'q1', entityType: 'generator', entityId: 'g1', operation: 'update', data: {}, timestamp: OLD, retryCount: 0 },
      {
        id: 'q2', entityType: 'workSession', entityId: 's-gone', operation: 'delete',
        data: { id: 's-gone', generatorId: 'g1' }, timestamp: OLD, retryCount: 2,
      },
    ]);

    expect(await getPendingChangesCount()).toBe(2);
    expect(await getTombstones()).toEqual([
      { key: 'workSession:s-gone', entityType: 'workSession', entityId: 's-gone', generatorId: 'g1', deletedAt: OLD },
    ]);
    expect((await getGenerators())[0].syncStatus).toBe('pending');
    expect(await AsyncStorage.getItem('@sync_queue')).toBeNull();
  });
});

describe('queries', () => {
  it('filters by generator and finds the active session', async () => {
    await saveWorkSession(makeSession());
    await saveWorkSession(makeSession({ id: 's2', generatorId: 'g2' }));
    await saveWorkSession(makeSession({ id: 's-active', endTime: undefined, hours: 0, isActive: true }));

    expect((await getWorkSessions('g2')).map(s => s.id)).toEqual(['s2']);
    expect((await getActiveWorkSession('g1'))?.id).toBe('s-active');
    expect(await getActiveWorkSession('g2')).toBeNull();
  });

  it('getLocalData returns every collection', async () => {
    await saveGenerator(makeGenerator());
    await saveRefill(makeRefill());
    await saveMaintenanceTask(makeTask());

    const data = await getLocalData();
    expect(Object.keys(data).sort()).toEqual(['generators', 'maintenanceTasks', 'refills', 'workSessions']);
    expect(data.refills).toHaveLength(1);
    expect(data.maintenanceTasks).toHaveLength(1);
  });

  it('updateLocalData persists only what the updater returns', async () => {
    await saveGenerator(makeGenerator());
    await updateLocalData(state => ({ refills: [...state.refills, makeRefill({ syncStatus: 'synced' })] }));

    expect(await getGenerators()).toHaveLength(1);
    expect((await getRefills())[0].syncStatus).toBe('synced');
  });
});

describe('language preference', () => {
  it('is null until saved, then round-trips', async () => {
    expect(await getSavedLanguage()).toBeNull();
    await saveLanguage('uk');
    expect(await getSavedLanguage()).toBe('uk');
  });
});
