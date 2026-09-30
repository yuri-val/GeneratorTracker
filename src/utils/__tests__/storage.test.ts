import AsyncStorage from '@react-native-async-storage/async-storage';
import { Generator, WorkSession, Refill, MaintenanceTask } from '../../models/types';
import { syncQueue } from '../syncQueue';

// storage.ts asks the auth service for the current user to decide whether a change
// must be queued for cloud sync. Control that per test.
const mockGetCurrentUser = jest.fn();
jest.mock('../../services/auth', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

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
} from '../storage';

const NOW = '2026-06-29T10:00:00.000Z';

const makeGenerator = (overrides: Partial<Generator> = {}): Generator => ({
  id: 'g1',
  name: 'Honda',
  purchaseDate: '2026-01-01',
  createdAt: NOW,
  lastModified: NOW,
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
  createdAt: NOW,
  lastModified: NOW,
  syncStatus: 'pending',
  ...overrides,
});

const makeRefill = (overrides: Partial<Refill> = {}): Refill => ({
  id: 'r1',
  generatorId: 'g1',
  date: '2026-06-29',
  amount: 5,
  createdAt: NOW,
  lastModified: NOW,
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
  createdAt: NOW,
  lastModified: NOW,
  syncStatus: 'pending',
  ...overrides,
});

beforeEach(async () => {
  await AsyncStorage.clear();
  mockGetCurrentUser.mockReturnValue(null);
});

describe('generators', () => {
  it('starts empty', async () => {
    expect(await getGenerators()).toEqual([]);
  });

  it('creates, then updates in place by id', async () => {
    await saveGenerator(makeGenerator());
    await saveGenerator(makeGenerator({ id: 'g2', name: 'Second' }));
    await saveGenerator(makeGenerator({ name: 'Honda EU22' }));

    const generators = await getGenerators();
    expect(generators.map(g => g.name)).toEqual(['Honda EU22', 'Second']);
  });

  it('fills in lastModified and a pending syncStatus when they are missing', async () => {
    const bare = { ...makeGenerator(), lastModified: '', syncStatus: undefined } as unknown as Generator;
    await saveGenerator(bare);

    const [saved] = await getGenerators();
    expect(saved.syncStatus).toBe('pending');
    expect(new Date(saved.lastModified).getTime()).not.toBeNaN();
  });

  it('keeps explicit sync metadata untouched', async () => {
    await saveGenerator(makeGenerator({ syncStatus: 'synced', syncedAt: NOW, userId: 'u1' }));

    const [saved] = await getGenerators();
    expect(saved).toMatchObject({ syncStatus: 'synced', syncedAt: NOW, userId: 'u1', lastModified: NOW });
  });

  it('cascades a delete to sessions, refills and maintenance tasks', async () => {
    await saveGenerator(makeGenerator());
    await saveGenerator(makeGenerator({ id: 'g2', name: 'Keep me' }));
    await saveWorkSession(makeSession());
    await saveWorkSession(makeSession({ id: 's2', generatorId: 'g2' }));
    await saveRefill(makeRefill());
    await saveRefill(makeRefill({ id: 'r2', generatorId: 'g2' }));
    await saveMaintenanceTask(makeTask());
    await saveMaintenanceTask(makeTask({ id: 'm2', generatorId: 'g2' }));

    await deleteGenerator('g1');

    expect((await getGenerators()).map(g => g.id)).toEqual(['g2']);
    expect((await getWorkSessions()).map(s => s.id)).toEqual(['s2']);
    expect((await getRefills()).map(r => r.id)).toEqual(['r2']);
    expect((await getMaintenanceTasks()).map(m => m.id)).toEqual(['m2']);
  });

  it('returns [] instead of throwing when the stored JSON is corrupted', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await AsyncStorage.setItem('@generators', '{not json');

    await expect(getGenerators()).resolves.toEqual([]);
    errorSpy.mockRestore();
  });
});

describe('work sessions', () => {
  it('filters by generator when asked', async () => {
    await saveWorkSession(makeSession());
    await saveWorkSession(makeSession({ id: 's2', generatorId: 'g2' }));

    expect((await getWorkSessions()).map(s => s.id)).toEqual(['s1', 's2']);
    expect((await getWorkSessions('g2')).map(s => s.id)).toEqual(['s2']);
  });

  it('finds the active session of a generator, or null', async () => {
    await saveWorkSession(makeSession());
    expect(await getActiveWorkSession('g1')).toBeNull();

    await saveWorkSession(makeSession({ id: 's-active', endTime: undefined, hours: 0, isActive: true }));
    expect((await getActiveWorkSession('g1'))?.id).toBe('s-active');
    expect(await getActiveWorkSession('other')).toBeNull();
  });

  it('deletes a single session', async () => {
    await saveWorkSession(makeSession());
    await saveWorkSession(makeSession({ id: 's2' }));
    await deleteWorkSession('s1');

    expect((await getWorkSessions()).map(s => s.id)).toEqual(['s2']);
  });
});

describe('refills and maintenance tasks', () => {
  it('round-trip and delete refills', async () => {
    await saveRefill(makeRefill());
    await saveRefill(makeRefill({ amount: 7.5 }));
    expect(await getRefills('g1')).toHaveLength(1);
    expect((await getRefills())[0].amount).toBe(7.5);

    await deleteRefill('r1');
    expect(await getRefills()).toEqual([]);
  });

  it('round-trip and delete maintenance tasks', async () => {
    await saveMaintenanceTask(makeTask());
    await saveMaintenanceTask(makeTask({ title: 'Air filter' }));
    expect((await getMaintenanceTasks('g1'))[0].title).toBe('Air filter');

    await deleteMaintenanceTask('m1');
    expect(await getMaintenanceTasks()).toEqual([]);
  });
});

describe('sync queue integration', () => {
  it('queues nothing while signed out', async () => {
    await saveGenerator(makeGenerator());
    await saveWorkSession(makeSession());
    await deleteGenerator('g1');

    expect(await syncQueue.getPendingCount()).toBe(0);
  });

  it('queues create, update and delete operations while signed in', async () => {
    mockGetCurrentUser.mockReturnValue({ uid: 'u1' });

    await saveGenerator(makeGenerator());
    await saveGenerator(makeGenerator({ name: 'Renamed' }));
    await deleteGenerator('g1');

    const queue = await syncQueue.getQueue();
    expect(queue.map(item => [item.entityType, item.operation])).toEqual([
      ['generator', 'create'],
      ['generator', 'update'],
      ['generator', 'delete'],
    ]);
    expect(queue[1].data.name).toBe('Renamed');
    // The delete keeps a snapshot so the sync service knows the parent generator.
    expect(queue[2].data.id).toBe('g1');
  });

  it('queues every entity type with its generator reference', async () => {
    mockGetCurrentUser.mockReturnValue({ uid: 'u1' });

    await saveWorkSession(makeSession());
    await saveRefill(makeRefill());
    await saveMaintenanceTask(makeTask());
    await deleteWorkSession('s1');

    const queue = await syncQueue.getQueue();
    expect(queue.map(item => item.entityType)).toEqual(['workSession', 'refill', 'maintenance', 'workSession']);
    expect(queue.every(item => item.data.generatorId === 'g1')).toBe(true);
  });

  it('does not re-queue records that arrive already synced (the pull path)', async () => {
    mockGetCurrentUser.mockReturnValue({ uid: 'u1' });

    await saveGenerator(makeGenerator({ syncStatus: 'synced' }));
    await saveWorkSession(makeSession({ syncStatus: 'synced' }));

    expect(await syncQueue.getPendingCount()).toBe(0);
  });
});

describe('language preference', () => {
  it('is null until saved, then round-trips', async () => {
    expect(await getSavedLanguage()).toBeNull();
    await saveLanguage('uk');
    expect(await getSavedLanguage()).toBe('uk');
  });
});
