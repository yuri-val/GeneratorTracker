import { test, expect, APIRequestContext, Page } from '@playwright/test';
import { waitForEmptyHome, goToTab, goBack, createGenerator, openGenerator, openDetailTab, visibleText } from './helpers';

/**
 * End-to-end cloud sync against the local Firebase Emulator Suite.
 *
 * Runs only inside `npm run test:e2e:emu` (FIREBASE_EMULATOR=1), which starts the
 * Auth + Firestore emulators and serves the web app with
 * EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true. Nothing here touches the real project.
 *
 * "Another device" is simulated by writing straight into Firestore through the
 * emulator's REST API with the `owner` token (bypasses security rules).
 */
const PROJECT = 'demo-generatortracker';
const AUTH = 'http://localhost:9099';
const FIRESTORE = `http://localhost:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const ADMIN_HEADERS = { Authorization: 'Bearer owner' };
const SYNC_TIMEOUT = 30_000;
const PASSWORD = 'e2e-only-password';

type FirestoreValue = { stringValue?: string; timestampValue?: string; doubleValue?: number; integerValue?: string };
type FirestoreDoc = { name: string; fields?: Record<string, FirestoreValue> };

const uniqueEmail = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;

// ---------- Firestore / Auth REST helpers ----------

const findUid = async (request: APIRequestContext, email: string): Promise<string> => {
  const response = await request.post(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:query`, {
    headers: ADMIN_HEADERS,
    data: {},
  });
  const body = (await response.json()) as { userInfo?: Array<{ localId: string; email?: string }> };
  const user = body.userInfo?.find(u => u.email === email);
  if (!user) throw new Error(`No emulator account for ${email}`);
  return user.localId;
};

const getDoc = async (request: APIRequestContext, path: string): Promise<FirestoreDoc | null> => {
  const response = await request.get(`${FIRESTORE}/${path}`, { headers: ADMIN_HEADERS });
  if (response.status() === 404) return null;
  return (await response.json()) as FirestoreDoc;
};

const listDocIds = async (request: APIRequestContext, path: string): Promise<string[]> => {
  const response = await request.get(`${FIRESTORE}/${path}`, { headers: ADMIN_HEADERS });
  const body = (await response.json()) as { documents?: FirestoreDoc[] };
  return (body.documents ?? []).map(d => d.name.split('/').pop() as string);
};

const listGeneratorNames = async (request: APIRequestContext, uid: string): Promise<string[]> => {
  const response = await request.get(`${FIRESTORE}/users/${uid}/generators`, { headers: ADMIN_HEADERS });
  const body = (await response.json()) as { documents?: FirestoreDoc[] };
  return (body.documents ?? []).map(d => d.fields?.name?.stringValue ?? '');
};

/** Full overwrite of a document, as a second device running the app would do. */
const writeDoc = async (request: APIRequestContext, path: string, fields: Record<string, FirestoreValue>) => {
  const response = await request.patch(`${FIRESTORE}/${path}`, { headers: ADMIN_HEADERS, data: { fields } });
  expect(response.ok()).toBe(true);
};

const deleteDoc = async (request: APIRequestContext, path: string) => {
  const response = await request.delete(`${FIRESTORE}/${path}`, { headers: ADMIN_HEADERS });
  expect(response.ok()).toBe(true);
};

const generatorIdByName = async (page: Page, name: string): Promise<string> => {
  const raw = await page.evaluate(() => localStorage.getItem('@generators') || '[]');
  const generator = (JSON.parse(raw) as Array<{ id: string; name: string }>).find(g => g.name === name);
  if (!generator) throw new Error(`Generator ${name} not found locally`);
  return generator.id;
};

const localGeneratorNames = async (page: Page): Promise<string[]> => {
  const raw = await page.evaluate(() => localStorage.getItem('@generators') || '[]');
  return (JSON.parse(raw) as Array<{ name: string }>).map(g => g.name);
};

const generatorFields = (id: string, uid: string, name: string, lastModified: FirestoreValue) => ({
  id: { stringValue: id },
  name: { stringValue: name },
  purchaseDate: { stringValue: '2026-01-01' },
  createdAt: { stringValue: '2026-01-01T00:00:00.000Z' },
  lastModified,
  userId: { stringValue: uid },
});

// ---------- App helpers ----------

const signUp = async (page: Page, email: string) => {
  await goToTab(page, 'Settings');
  await page.getByTestId('auth-toggle-mode').click();
  await page.getByTestId('input-email').fill(email);
  await page.getByTestId('input-password').fill(PASSWORD);
  await page.getByTestId('auth-submit').click();
  await expect(page.getByTestId('sign-out')).toBeVisible({ timeout: SYNC_TIMEOUT });
};

const signIn = async (page: Page, email: string) => {
  await goToTab(page, 'Settings');
  await page.getByTestId('input-email').fill(email);
  await page.getByTestId('input-password').fill(PASSWORD);
  await page.getByTestId('auth-submit').click();
  await expect(page.getByTestId('sign-out')).toBeVisible({ timeout: SYNC_TIMEOUT });
};

const syncNow = async (page: Page) => {
  await goToTab(page, 'Settings');
  await page.getByTestId('sync-now').click();
};

test.describe('Cloud sync against the Firebase emulators', () => {
  test.skip(
    process.env.FIREBASE_EMULATOR !== '1',
    'Run with `npm run test:e2e:emu` (starts the emulators and sets FIREBASE_EMULATOR=1)'
  );

  test('sign up, push a local generator with Sync Now, then pull one created in the cloud', async ({ page, request }) => {
    const email = uniqueEmail();
    await page.goto('/');
    await waitForEmptyHome(page);
    await signUp(page, email);
    const uid = await findUid(request, email);

    await goToTab(page, 'Home');
    await createGenerator(page, 'Pushed Gen');
    await syncNow(page);
    await expect.poll(() => listGeneratorNames(request, uid), { timeout: SYNC_TIMEOUT }).toContain('Pushed Gen');

    const now = new Date().toISOString();
    await writeDoc(request, `users/${uid}/generators/remote-1`, generatorFields('remote-1', uid, 'Pulled Gen', { stringValue: now }));

    await expect.poll(() => localGeneratorNames(page), { timeout: SYNC_TIMEOUT }).toContain('Pulled Gen');
    await goToTab(page, 'Home');
    await expect(visibleText(page, 'Pulled Gen')).toBeVisible();
  });

  test('S-1: edits from another device keep arriving after this device pushed the record', async ({ page, request }) => {
    const email = uniqueEmail();
    await page.goto('/');
    await waitForEmptyHome(page);
    await createGenerator(page, 'Shared Gen');
    await signUp(page, email); // initial sync pushes it
    const uid = await findUid(request, email);
    const id = await generatorIdByName(page, 'Shared Gen');
    await expect.poll(() => listGeneratorNames(request, uid), { timeout: SYNC_TIMEOUT }).toContain('Shared Gen');

    // The client time is stored as-is (not replaced by a server timestamp).
    const pushed = await getDoc(request, `users/${uid}/generators/${id}`);
    expect(pushed?.fields?.lastModified?.stringValue).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // Another device (current app) edits it.
    const later = new Date(Date.now() + 60_000).toISOString();
    await writeDoc(request, `users/${uid}/generators/${id}`, generatorFields(id, uid, 'Renamed Elsewhere', { stringValue: later }));
    await expect.poll(() => localGeneratorNames(page), { timeout: SYNC_TIMEOUT }).toContain('Renamed Elsewhere');

    // An older app version writes lastModified as a server timestamp — still applied.
    const evenLater = new Date(Date.now() + 120_000).toISOString();
    await writeDoc(request, `users/${uid}/generators/${id}`, generatorFields(id, uid, 'Renamed By Old App', { timestampValue: evenLater }));
    await expect.poll(() => localGeneratorNames(page), { timeout: SYNC_TIMEOUT }).toContain('Renamed By Old App');

    // …and the device can still edit it afterwards and win.
    await goToTab(page, 'Home');
    await openGenerator(page, 'Renamed By Old App');
    await page.getByTestId('detail-edit-generator').click();
    await page.getByTestId('input-generator-name').fill('Final Local Name');
    await page.getByTestId('save-generator').click();
    await goBack(page);
    await syncNow(page);
    await expect.poll(() => listGeneratorNames(request, uid), { timeout: SYNC_TIMEOUT }).toEqual(['Final Local Name']);
  });

  test('S-1: clearing an optional field on the device clears it in the cloud', async ({ page, request }) => {
    const email = uniqueEmail();
    await page.goto('/');
    await waitForEmptyHome(page);
    await createGenerator(page, 'Model Gen', 'EU22i');
    await signUp(page, email);
    const uid = await findUid(request, email);
    const id = await generatorIdByName(page, 'Model Gen');
    await expect
      .poll(async () => (await getDoc(request, `users/${uid}/generators/${id}`))?.fields?.model?.stringValue, { timeout: SYNC_TIMEOUT })
      .toBe('EU22i');

    await goToTab(page, 'Home');
    await openGenerator(page, 'Model Gen');
    await page.getByTestId('detail-edit-generator').click();
    await page.getByTestId('input-generator-model').fill('');
    await page.getByTestId('save-generator').click();
    await goBack(page);
    await syncNow(page);

    await expect
      .poll(async () => {
        const doc = await getDoc(request, `users/${uid}/generators/${id}`);
        return doc ? Object.keys(doc.fields ?? {}).includes('model') : 'missing';
      }, { timeout: SYNC_TIMEOUT })
      .toBe(false);
  });

  test('S-2: a deletion on another device removes the record here', async ({ page, request }) => {
    const email = uniqueEmail();
    await page.goto('/');
    await waitForEmptyHome(page);
    await createGenerator(page, 'Doomed Gen');
    await createGenerator(page, 'Survivor Gen');
    await signUp(page, email);
    const uid = await findUid(request, email);
    const id = await generatorIdByName(page, 'Doomed Gen');
    await expect.poll(async () => (await listGeneratorNames(request, uid)).length, { timeout: SYNC_TIMEOUT }).toBe(2);

    await deleteDoc(request, `users/${uid}/generators/${id}`);

    await expect.poll(() => localGeneratorNames(page), { timeout: SYNC_TIMEOUT }).toEqual(['Survivor Gen']);
    await goToTab(page, 'Home');
    await expect(visibleText(page, 'Doomed Gen', true)).toHaveCount(0);
  });

  test('S-2: a deletion made while signed out is pushed on the next sign-in and stays deleted', async ({ page, request }) => {
    const email = uniqueEmail();
    await page.goto('/');
    await waitForEmptyHome(page);
    await createGenerator(page, 'Offline Deleted');
    await signUp(page, email);
    const uid = await findUid(request, email);
    const id = await generatorIdByName(page, 'Offline Deleted');
    await expect.poll(() => listGeneratorNames(request, uid), { timeout: SYNC_TIMEOUT }).toContain('Offline Deleted');

    await page.getByTestId('sign-out').click();
    await expect(page.getByTestId('auth-submit')).toBeVisible();

    await goToTab(page, 'Home');
    await openGenerator(page, 'Offline Deleted');
    await page.getByTestId('detail-delete-generator').click();
    await page.getByTestId('confirm-delete').click();
    await waitForEmptyHome(page);

    await signIn(page, email); // before 2.4.2 the initial sync brought it straight back

    await expect.poll(() => getDoc(request, `users/${uid}/generators/${id}`), { timeout: SYNC_TIMEOUT }).toBeNull();
    await page.reload();
    await waitForEmptyHome(page);
    expect(await localGeneratorNames(page)).toEqual([]);
  });

  test('S-3: deleting a generator removes its records from the cloud too', async ({ page, request }) => {
    const email = uniqueEmail();
    await page.goto('/');
    await waitForEmptyHome(page);
    await createGenerator(page, 'Cascade Gen');
    await openGenerator(page, 'Cascade Gen');
    await openDetailTab(page, 'Refills');
    await page.getByText('Add Refill', { exact: true }).first().click();
    await page.getByTestId('input-refill-amount').fill('7');
    await page.getByTestId('save-refill').click();
    await expect(page.getByRole('tab', { name: /Refills \(1\)/ }).first()).toBeVisible();
    await goBack(page);

    await signUp(page, email);
    const uid = await findUid(request, email);
    const id = await generatorIdByName(page, 'Cascade Gen');
    await expect.poll(() => listDocIds(request, `users/${uid}/generators/${id}/refills`), { timeout: SYNC_TIMEOUT }).toHaveLength(1);

    await goToTab(page, 'Home');
    await openGenerator(page, 'Cascade Gen');
    await page.getByTestId('detail-delete-generator').click();
    await page.getByTestId('confirm-delete').click();
    await waitForEmptyHome(page);
    await syncNow(page);

    await expect.poll(() => getDoc(request, `users/${uid}/generators/${id}`), { timeout: SYNC_TIMEOUT }).toBeNull();
    expect(await listDocIds(request, `users/${uid}/generators/${id}/refills`)).toEqual([]);
  });

  test('S-3: records left behind in the cloud by older versions do not inflate analytics', async ({ page, request }) => {
    const email = uniqueEmail();
    await page.goto('/');
    await waitForEmptyHome(page);
    await createGenerator(page, 'Real Gen');
    await signUp(page, email);
    const uid = await findUid(request, email);
    await expect.poll(() => listGeneratorNames(request, uid), { timeout: SYNC_TIMEOUT }).toContain('Real Gen');

    // An orphaned refill whose generator no longer exists (old app deleted only the parent).
    await writeDoc(request, `users/${uid}/generators/ghost-gen/refills/ghost-refill`, {
      id: { stringValue: 'ghost-refill' },
      generatorId: { stringValue: 'ghost-gen' },
      date: { stringValue: '2026-06-01' },
      amount: { doubleValue: 999 },
      createdAt: { stringValue: '2026-06-01T00:00:00.000Z' },
      lastModified: { stringValue: '2026-06-01T00:00:00.000Z' },
      userId: { stringValue: uid },
    });
    await syncNow(page);

    await goToTab(page, 'Analytics');
    await expect(visibleText(page, 'LITERS USED')).toBeVisible();
    await expect(visibleText(page, '0.0', true).first()).toBeVisible();
    await expect(visibleText(page, '999.0', true)).toHaveCount(0);
    const refills = await page.evaluate(() => localStorage.getItem('@refills') || '[]');
    expect(refills).not.toContain('ghost-refill');
  });
});
