import { applyRemoteChanges, MergeContext, RemoteChangeSet } from '../syncMerge';
import { Generator, LocalData, WorkSession, Refill, Tombstone } from '../../models/types';

const T1 = '2026-06-01T00:00:00.000Z';
const T2 = '2026-06-02T00:00:00.000Z';
const T3 = '2026-06-03T00:00:00.000Z';
const SNAPSHOT = '2026-06-10T00:00:00.000Z';
const NOW = '2026-06-10T00:00:01.000Z';

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

const session = (id: string, generatorId: string, overrides: Partial<WorkSession> = {}): WorkSession => ({
  id,
  generatorId,
  date: '2026-06-01',
  startTime: '09:00',
  endTime: '10:00',
  hours: 1,
  createdAt: T1,
  lastModified: T1,
  syncStatus: 'synced',
  syncedAt: T1,
  userId: 'u1',
  ...overrides,
});

const refill = (id: string, generatorId: string, overrides: Partial<Refill> = {}): Refill => ({
  id,
  generatorId,
  date: '2026-06-01',
  amount: 5,
  createdAt: T1,
  lastModified: T1,
  syncStatus: 'synced',
  syncedAt: T1,
  userId: 'u1',
  ...overrides,
});

const remote = <T extends { syncStatus?: unknown; syncedAt?: unknown }>(record: T) => {
  const { syncStatus: _s, syncedAt: _a, ...rest } = record;
  return rest as unknown as T;
};

const local = (data: Partial<LocalData> = {}): LocalData => ({
  generators: [],
  workSessions: [],
  refills: [],
  maintenanceTasks: [],
  ...data,
});

const ctx = (tombstones: Tombstone[] = []): MergeContext => ({ uid: 'u1', syncedAt: NOW, snapshotTime: SNAPSHOT, tombstones });

const complete = (entityType: RemoteChangeSet['entityType'], upserts: any[]): RemoteChangeSet => ({
  entityType,
  upserts,
  presentIds: upserts.map(u => u.id),
});

describe('last write wins', () => {
  it('replaces the local record with a newer remote one and marks it synced', () => {
    const result = applyRemoteChanges(
      local({ generators: [gen('g1', { name: 'Local', lastModified: T1, syncStatus: 'pending' })] }),
      [{ entityType: 'generator', upserts: [remote(gen('g1', { name: 'Remote', lastModified: T2 }))] }],
      ctx()
    );
    expect(result.generators[0]).toMatchObject({ name: 'Remote', syncStatus: 'synced', syncedAt: NOW });
  });

  it('keeps a newer local edit pending', () => {
    const result = applyRemoteChanges(
      local({ generators: [gen('g1', { name: 'Local', lastModified: T3, syncStatus: 'pending' })] }),
      [{ entityType: 'generator', upserts: [remote(gen('g1', { name: 'Remote', lastModified: T2 }))] }],
      ctx()
    );
    expect(result.generators[0]).toMatchObject({ name: 'Local', syncStatus: 'pending' });
  });

  it('treats an equal timestamp as confirmation of the local version (echo of own push)', () => {
    const result = applyRemoteChanges(
      local({ generators: [gen('g1', { lastModified: T2, syncStatus: 'pending', syncedAt: undefined, userId: undefined })] }),
      [{ entityType: 'generator', upserts: [remote(gen('g1', { lastModified: T2 }))] }],
      ctx()
    );
    expect(result.generators[0]).toMatchObject({ syncStatus: 'synced', syncedAt: NOW, userId: 'u1' });
  });

  it('understands Timestamp-shaped lastModified from older app versions (S-1)', () => {
    const legacyRemote = { ...remote(gen('g1', { name: 'Remote' })), lastModified: { seconds: Date.parse(T3) / 1000, nanoseconds: 0 } };
    const result = applyRemoteChanges(
      local({ generators: [gen('g1', { name: 'Local', lastModified: T2 })] }),
      [{ entityType: 'generator', upserts: [legacyRemote as unknown as Generator] }],
      ctx()
    );
    expect(result.generators[0]).toMatchObject({ name: 'Remote', lastModified: T3 });
  });

  it('adds remote-only records and strips remote-only fields', () => {
    const withServerField = { ...remote(gen('g2')), serverUpdatedAt: T3 } as unknown as Generator;
    const result = applyRemoteChanges(local(), [{ entityType: 'generator', upserts: [withServerField] }], ctx());
    expect(result.generators).toHaveLength(1);
    expect(result.generators[0]).not.toHaveProperty('serverUpdatedAt');
    expect(result.generators[0].syncStatus).toBe('synced');
  });
});

describe('local tombstones win (S-2)', () => {
  const tombstone = (entityType: Tombstone['entityType'], entityId: string, generatorId?: string): Tombstone => ({
    key: `${entityType}:${entityId}`,
    entityType,
    entityId,
    generatorId,
    deletedAt: T2,
  });

  it('never re-adds a record deleted on this device', () => {
    const result = applyRemoteChanges(
      local(),
      [complete('generator', [remote(gen('g1'))]), complete('workSession', [remote(session('s1', 'g2'))])],
      { ...ctx([tombstone('generator', 'g1'), tombstone('workSession', 's1', 'g2')]) }
    );
    expect(result.generators).toEqual([]);
    expect(result.workSessions).toEqual([]);
  });

  it('never re-adds children of a generator deleted on this device', () => {
    const result = applyRemoteChanges(
      local(),
      [{ entityType: 'refill', upserts: [remote(refill('r1', 'g1'))] }],
      ctx([tombstone('generator', 'g1')])
    );
    expect(result.refills).toEqual([]);
  });
});

describe('remote deletions (S-2)', () => {
  it('applies realtime removals, including local pending edits (delete wins)', () => {
    const result = applyRemoteChanges(
      local({ workSessions: [session('s1', 'g1', { syncStatus: 'pending', lastModified: T3 }), session('s2', 'g1')] }),
      [{ entityType: 'workSession', upserts: [], removedIds: ['s1'] }],
      ctx()
    );
    expect(result.workSessions.map(s => s.id)).toEqual(['s2']);
  });

  it('cascades a removed generator to its local children', () => {
    const result = applyRemoteChanges(
      local({
        generators: [gen('g1'), gen('g2')],
        workSessions: [session('s1', 'g1'), session('s2', 'g2')],
        refills: [refill('r1', 'g1')],
      }),
      [{ entityType: 'generator', upserts: [], removedIds: ['g1'] }],
      ctx()
    );
    expect(result.generators.map(g => g.id)).toEqual(['g2']);
    expect(result.workSessions.map(s => s.id)).toEqual(['s2']);
    expect(result.refills).toEqual([]);
  });

  it('prunes records missing from a complete snapshot only if they were confirmed in this cloud', () => {
    const result = applyRemoteChanges(
      local({
        generators: [
          gen('deleted-elsewhere'), // synced to u1 before the snapshot → deleted remotely
          gen('new-local', { syncStatus: 'pending', syncedAt: undefined, userId: undefined }), // never uploaded
          gen('other-account', { userId: 'someone-else' }), // belongs to another account (S-4)
          gen('synced-after-snapshot', { syncedAt: '2026-06-10T00:00:00.500Z' }), // pushed while fetching
          gen('kept'),
        ],
      }),
      [complete('generator', [remote(gen('kept'))])],
      ctx()
    );
    expect(result.generators.map(g => g.id)).toEqual(['new-local', 'other-account', 'synced-after-snapshot', 'kept']);
  });

  it('prunes an edited record deleted elsewhere (it was in the cloud: syncedAt is set)', () => {
    const result = applyRemoteChanges(
      local({ workSessions: [session('s1', 'g1', { syncStatus: 'pending', lastModified: T3 })], generators: [gen('g1')] }),
      [complete('generator', [remote(gen('g1'))]), complete('workSession', [])],
      ctx()
    );
    expect(result.workSessions).toEqual([]);
  });
});

describe('orphans (S-3)', () => {
  it('does not store remote children whose generator no longer exists', () => {
    const result = applyRemoteChanges(
      local(),
      [
        complete('generator', [remote(gen('g1'))]),
        complete('workSession', [remote(session('s1', 'g1')), remote(session('orphan', 'deleted-gen'))]),
        complete('refill', [remote(refill('orphan-refill', 'deleted-gen'))]),
      ],
      ctx()
    );
    expect(result.workSessions.map(s => s.id)).toEqual(['s1']);
    expect(result.refills).toEqual([]);
  });

  it('removes local children whose generator is gone, but keeps children of unpushed generators', () => {
    const result = applyRemoteChanges(
      local({
        generators: [gen('local-new', { syncStatus: 'pending', syncedAt: undefined, userId: undefined })],
        workSessions: [
          session('stray', 'vanished-gen', { syncStatus: 'pending', syncedAt: undefined, userId: undefined }),
          session('ok', 'local-new', { syncStatus: 'pending', syncedAt: undefined, userId: undefined }),
        ],
      }),
      [complete('generator', []), complete('workSession', [])],
      ctx()
    );
    expect(result.generators.map(g => g.id)).toEqual(['local-new']);
    expect(result.workSessions.map(s => s.id)).toEqual(['ok']);
  });

  it('keeps children that arrive through a listener before their generator', () => {
    const result = applyRemoteChanges(
      local(),
      [{ entityType: 'workSession', upserts: [remote(session('s1', 'g-not-yet-here'))] }],
      ctx()
    );
    expect(result.workSessions.map(s => s.id)).toEqual(['s1']);
  });
});

it('does not mutate its input', () => {
  const input = local({ generators: [gen('g1')] });
  const snapshot = JSON.stringify(input);
  applyRemoteChanges(input, [{ entityType: 'generator', upserts: [], removedIds: ['g1'] }], ctx());
  expect(JSON.stringify(input)).toBe(snapshot);
});
