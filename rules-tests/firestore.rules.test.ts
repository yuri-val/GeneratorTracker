import fs from 'fs';
import path from 'path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  collectionGroup,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';

const PROJECT_ID = 'demo-generatortracker';
const NOW = '2026-09-30T10:00:00.000Z';

let env: RulesTestEnvironment;

const generator = (uid: string, id = 'g1') => ({
  id,
  name: 'Honda',
  purchaseDate: '2026-01-01',
  createdAt: NOW,
  lastModified: NOW,
  userId: uid,
});

const session = (uid: string, generatorId = 'g1', id = 's1') => ({
  id,
  generatorId,
  date: '2026-09-30',
  startTime: '09:00',
  endTime: '11:00',
  hours: 2,
  createdAt: NOW,
  lastModified: NOW,
  userId: uid,
});

beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Firestore emulator not running — use `npm run test:rules`');
  }
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

const seed = async (writes: Array<[string, Record<string, unknown>]>) => {
  await env.withSecurityRulesDisabled(async context => {
    for (const [docPath, data] of writes) {
      await setDoc(doc(context.firestore(), docPath), data);
    }
  });
};

describe('owner access', () => {
  it('lets the owner create, read, update and delete a generator', async () => {
    const db = env.authenticatedContext('alice').firestore();
    const ref = doc(db, 'users/alice/generators/g1');

    await assertSucceeds(setDoc(ref, generator('alice')));
    await assertSucceeds(getDoc(ref));
    await assertSucceeds(setDoc(ref, { ...generator('alice'), name: 'Renamed', serverUpdatedAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(ref));
  });

  it('lets the owner write children and list a generator subcollection (cascade delete)', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(db, 'users/alice/generators/g1'), generator('alice')));
    await assertSucceeds(setDoc(doc(db, 'users/alice/generators/g1/workSessions/s1'), session('alice')));
    await assertSucceeds(
      setDoc(doc(db, 'users/alice/generators/g1/refills/r1'), {
        id: 'r1', generatorId: 'g1', date: '2026-09-30', amount: 5, createdAt: NOW, lastModified: NOW, userId: 'alice',
      })
    );
    await assertSucceeds(
      setDoc(doc(db, 'users/alice/generators/g1/maintenanceTasks/m1'), {
        id: 'm1', generatorId: 'g1', title: 'Oil', intervalHours: 250, lastServiceHours: 0,
        lastServiceDate: '2026-01-01', createdAt: NOW, lastModified: NOW, userId: 'alice',
      })
    );
    await assertSucceeds(getDocs(collection(db, 'users/alice/generators/g1/workSessions')));
    await assertSucceeds(deleteDoc(doc(db, 'users/alice/generators/g1/workSessions/s1')));
  });

  it('accepts the server-timestamp lastModified written by app versions before 2.4.2', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(
      setDoc(doc(db, 'users/alice/generators/g1'), { ...generator('alice'), lastModified: serverTimestamp() })
    );
  });
});

describe('isolation between users', () => {
  it('denies unauthenticated access', async () => {
    await seed([['users/alice/generators/g1', generator('alice')]]);
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'users/alice/generators/g1')));
    await assertFails(setDoc(doc(db, 'users/alice/generators/g2'), generator('alice', 'g2')));
  });

  it("denies reading or writing another user's data", async () => {
    await seed([
      ['users/alice/generators/g1', generator('alice')],
      ['users/alice/generators/g1/workSessions/s1', session('alice')],
    ]);
    const bob = env.authenticatedContext('bob').firestore();
    await assertFails(getDoc(doc(bob, 'users/alice/generators/g1')));
    await assertFails(getDoc(doc(bob, 'users/alice/generators/g1/workSessions/s1')));
    await assertFails(setDoc(doc(bob, 'users/alice/generators/g2'), generator('alice', 'g2')));
    await assertFails(deleteDoc(doc(bob, 'users/alice/generators/g1')));
  });
});

describe('document shape', () => {
  it('rejects a userId that does not match the owner path', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'users/alice/generators/g1'), generator('bob')));
  });

  it('rejects an id that does not match the document id', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'users/alice/generators/g1'), generator('alice', 'other')));
  });

  it('rejects a child whose generatorId does not match its parent', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'users/alice/generators/g1/workSessions/s1'), session('alice', 'g2')));
  });

  it('rejects a missing lastModified', async () => {
    const db = env.authenticatedContext('alice').firestore();
    const { lastModified: _omit, ...withoutLastModified } = generator('alice');
    await assertFails(setDoc(doc(db, 'users/alice/generators/g1'), withoutLastModified));
  });
});

describe('collection-group queries used by sync', () => {
  beforeEach(async () => {
    await seed([
      ['users/alice/generators/g1/workSessions/s1', session('alice')],
      ['users/bob/generators/g9/workSessions/s9', session('bob', 'g9', 's9')],
    ]);
  });

  it("allows the owner's userId-filtered query and returns only their documents", async () => {
    const db = env.authenticatedContext('alice').firestore();
    const snapshot = await assertSucceeds(
      getDocs(query(collectionGroup(db, 'workSessions'), where('userId', '==', 'alice')))
    );
    expect(snapshot.docs.map(d => d.id)).toEqual(['s1']);
  });

  it("denies querying someone else's userId or querying without the filter", async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(getDocs(query(collectionGroup(db, 'workSessions'), where('userId', '==', 'bob'))));
    await assertFails(getDocs(collectionGroup(db, 'workSessions')));
  });
});
