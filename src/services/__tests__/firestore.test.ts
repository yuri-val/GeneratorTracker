import { Generator, WorkSession, Tombstone } from '../../models/types';

/**
 * firebase/firestore is replaced by a tiny in-memory fake that records every batch
 * commit, so batching, ordering and failure handling can be asserted exactly.
 */
type Op = [kind: 'set' | 'delete', path: string, data?: Record<string, unknown>];

const mockCommits: Op[][] = [];
let mockFailOnCommit: number | null = null;
const mockServerDocs: Record<string, string[]> = {};

jest.mock('firebase/firestore', () => {
  class Timestamp {
    mockMs: number;
    constructor(mockMs: number) {
      this.mockMs = mockMs;
    }
    toDate() {
      return new Date(this.mockMs);
    }
  }
  const ref = (segments: string[]) => ({ path: segments.join('/') });
  return {
    Timestamp,
    serverTimestamp: () => 'SERVER_TIMESTAMP',
    collection: (_db: unknown, ...segments: string[]) => ref(segments),
    doc: (_db: unknown, ...segments: string[]) => ref(segments),
    collectionGroup: (_db: unknown, id: string) => ({ group: id }),
    query: (target: object, ...clauses: unknown[]) => ({ ...target, clauses }),
    where: (...args: unknown[]) => ({ where: args }),
    // Keyed by collection path, or `group:<id>` for collection-group queries (whose entries
    // are full document paths).
    getDocsFromServer: jest.fn(async (target: { path?: string; group?: string }) => {
      const key = target.path ?? `group:${target.group}`;
      return {
        docs: (mockServerDocs[key] ?? []).map(entry => {
          const path = entry.includes('/') ? entry : `${target.path}/${entry}`;
          return { id: path.split('/').pop(), ref: { path } };
        }),
      };
    }),
    writeBatch: () => {
      const ops: Op[] = [];
      return {
        set: (r: { path: string }, data: Record<string, unknown>) => ops.push(['set', r.path, data]),
        delete: (r: { path: string }) => ops.push(['delete', r.path]),
        commit: async () => {
          if (mockFailOnCommit !== null && mockCommits.length === mockFailOnCommit) {
            throw new Error('commit failed');
          }
          mockCommits.push(ops);
        },
      };
    },
  };
});

import { Timestamp } from 'firebase/firestore';
import {
  toFirestoreDoc,
  fromFirestoreDoc,
  writeEntities,
  deleteRemoteEntities,
  deleteAllRemoteData,
  withTimeout,
  SyncTimeoutError,
  BATCH_LIMIT,
} from '../firestore';

const NOW = '2026-09-30T10:00:00.000Z';

const gen = (id: string, overrides: Partial<Generator> = {}): Generator => ({
  id,
  name: id,
  purchaseDate: '2026-01-01',
  createdAt: NOW,
  lastModified: NOW,
  syncStatus: 'pending',
  ...overrides,
});

const session = (id: string, generatorId = 'g1'): WorkSession => ({
  id,
  generatorId,
  date: '2026-09-30',
  startTime: '09:00',
  hours: 0,
  createdAt: NOW,
  lastModified: NOW,
  syncStatus: 'pending',
});

beforeEach(() => {
  mockCommits.length = 0;
  mockFailOnCommit = null;
  for (const key of Object.keys(mockServerDocs)) delete mockServerDocs[key];
});

describe('toFirestoreDoc', () => {
  it('keeps the client lastModified, adds serverUpdatedAt and the owner, drops local-only and undefined fields', () => {
    const data = toFirestoreDoc(gen('g1', { model: undefined, syncedAt: NOW, userId: 'stale' }), 'u1');

    expect(data).toEqual({
      id: 'g1',
      name: 'g1',
      purchaseDate: '2026-01-01',
      createdAt: NOW,
      lastModified: NOW,
      userId: 'u1',
      serverUpdatedAt: 'SERVER_TIMESTAMP',
    });
  });
});

describe('fromFirestoreDoc', () => {
  it('converts Timestamps (incl. a legacy server-time lastModified) and drops serverUpdatedAt', () => {
    const ms = Date.parse(NOW);
    const record = fromFirestoreDoc<Generator>(
      {
        name: 'Honda',
        lastModified: new (Timestamp as unknown as new (ms: number) => object)(ms),
        createdAt: new (Timestamp as unknown as new (ms: number) => object)(ms),
        serverUpdatedAt: new (Timestamp as unknown as new (ms: number) => object)(ms),
      },
      'doc-id'
    );

    expect(record).toEqual({ id: 'doc-id', name: 'Honda', lastModified: NOW, createdAt: NOW });
  });
});

describe('writeEntities', () => {
  it('writes full documents (no merge) at the right paths', async () => {
    const result = await writeEntities('u1', [
      { entityType: 'generator', entity: gen('g1') },
      { entityType: 'workSession', entity: session('s1') },
    ]);

    expect(result.error).toBeUndefined();
    expect(result.done).toHaveLength(2);
    expect(mockCommits).toHaveLength(1);
    expect(mockCommits[0].map(([kind, path]) => [kind, path])).toEqual([
      ['set', 'users/u1/generators/g1'],
      ['set', 'users/u1/generators/g1/workSessions/s1'],
    ]);
  });

  it(`splits large uploads into batches of ${BATCH_LIMIT}`, async () => {
    const writes = Array.from({ length: BATCH_LIMIT * 2 + 10 }, (_, i) => ({
      entityType: 'generator' as const,
      entity: gen(`g${i}`),
    }));

    const result = await writeEntities('u1', writes);

    expect(mockCommits.map(c => c.length)).toEqual([BATCH_LIMIT, BATCH_LIMIT, 10]);
    expect(result.done).toHaveLength(writes.length);
  });

  it('reports what was committed before a failing batch', async () => {
    mockFailOnCommit = 1;
    const writes = Array.from({ length: BATCH_LIMIT + 5 }, (_, i) => ({ entityType: 'generator' as const, entity: gen(`g${i}`) }));

    const result = await writeEntities('u1', writes);

    expect(result.done).toHaveLength(BATCH_LIMIT);
    expect(result.error?.message).toBe('commit failed');
  });

  it('rejects a child without generatorId as an error result', async () => {
    const result = await writeEntities('u1', [{ entityType: 'refill', entity: { ...session('x'), generatorId: '' } as never }]);
    expect(result.error?.message).toMatch(/no generatorId/);
  });
});

describe('deleteRemoteEntities (S-3)', () => {
  const tombstone = (entityType: Tombstone['entityType'], entityId: string, generatorId?: string): Tombstone => ({
    key: `${entityType}:${entityId}`,
    entityType,
    entityId,
    generatorId,
    deletedAt: NOW,
  });

  it('deletes a generator with all its subcollection documents, generator last', async () => {
    mockServerDocs['users/u1/generators/g1/workSessions'] = ['s1', 's2'];
    mockServerDocs['users/u1/generators/g1/refills'] = ['r1'];
    mockServerDocs['users/u1/generators/g1/maintenanceTasks'] = ['m1'];

    const result = await deleteRemoteEntities('u1', [tombstone('generator', 'g1')]);

    expect(result.error).toBeUndefined();
    expect(result.done.map(t => t.key)).toEqual(['generator:g1']);
    expect(mockCommits.flat().map(([kind, path]) => `${kind} ${path}`)).toEqual([
      'delete users/u1/generators/g1/workSessions/s1',
      'delete users/u1/generators/g1/workSessions/s2',
      'delete users/u1/generators/g1/refills/r1',
      'delete users/u1/generators/g1/maintenanceTasks/m1',
      'delete users/u1/generators/g1',
    ]);
  });

  it('deletes children before generators and addresses them through their parent', async () => {
    const result = await deleteRemoteEntities('u1', [
      tombstone('generator', 'g2'),
      tombstone('refill', 'r1', 'g1'),
    ]);

    expect(result.done.map(t => t.key)).toEqual(['refill:r1', 'generator:g2']);
    expect(mockCommits.flat().map(([, path]) => path)).toEqual(['users/u1/generators/g1/refills/r1', 'users/u1/generators/g2']);
  });

  it('only reports a generator done once its last batch is committed', async () => {
    mockServerDocs['users/u1/generators/g1/workSessions'] = Array.from({ length: BATCH_LIMIT + 3 }, (_, i) => `s${i}`);
    mockFailOnCommit = 1;

    const result = await deleteRemoteEntities('u1', [tombstone('generator', 'g1')]);

    expect(result.done).toEqual([]);
    expect(result.error).toBeDefined();
  });

  it('drops a child tombstone that cannot be addressed (no generatorId)', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await deleteRemoteEntities('u1', [tombstone('workSession', 's1')]);
    expect(result.done.map(t => t.key)).toEqual(['workSession:s1']);
    expect(mockCommits).toEqual([]);
    warn.mockRestore();
  });
});

describe('deleteAllRemoteData (account deletion)', () => {
  beforeEach(() => {
    mockCommits.length = 0;
    mockFailOnCommit = null;
    for (const key of Object.keys(mockServerDocs)) delete mockServerDocs[key];
  });

  it('deletes every owned child (incl. orphans) and then every generator', async () => {
    mockServerDocs['group:workSessions'] = ['users/u1/generators/g1/workSessions/s1', 'users/u1/generators/gone/workSessions/s9'];
    mockServerDocs['group:refills'] = ['users/u1/generators/g1/refills/r1'];
    mockServerDocs['group:maintenanceTasks'] = ['users/u1/generators/g2/maintenanceTasks/t1'];
    mockServerDocs['users/u1/generators'] = ['g1', 'g2'];

    await expect(deleteAllRemoteData('u1')).resolves.toBe(6);

    const deleted = mockCommits.flat().map(([kind, path]) => `${kind} ${path}`);
    expect(deleted).toEqual([
      'delete users/u1/generators/g1/workSessions/s1',
      'delete users/u1/generators/gone/workSessions/s9',
      'delete users/u1/generators/g1/refills/r1',
      'delete users/u1/generators/g2/maintenanceTasks/t1',
      'delete users/u1/generators/g1',
      'delete users/u1/generators/g2',
    ]);
  });

  it('succeeds with nothing to delete', async () => {
    await expect(deleteAllRemoteData('u1')).resolves.toBe(0);
    expect(mockCommits).toEqual([]);
  });

  it(`splits large deletions into batches of ${BATCH_LIMIT} and throws when a batch fails`, async () => {
    mockServerDocs['users/u1/generators'] = Array.from({ length: BATCH_LIMIT + 5 }, (_, i) => `g${i}`);
    mockFailOnCommit = 1;

    await expect(deleteAllRemoteData('u1')).rejects.toThrow('commit failed');
    expect(mockCommits).toHaveLength(1);
    expect(mockCommits[0]).toHaveLength(BATCH_LIMIT);
  });
});

describe('withTimeout', () => {
  it('rejects with SyncTimeoutError when the operation hangs', async () => {
    jest.useFakeTimers();
    const pending = withTimeout(new Promise(() => {}), 'Uploading', 1000);
    jest.advanceTimersByTime(1000);
    await expect(pending).rejects.toBeInstanceOf(SyncTimeoutError);
    jest.useRealTimers();
  });

  it('passes results and errors through', async () => {
    await expect(withTimeout(Promise.resolve(1), 'x')).resolves.toBe(1);
    await expect(withTimeout(Promise.reject(new Error('nope')), 'x')).rejects.toThrow('nope');
  });
});
