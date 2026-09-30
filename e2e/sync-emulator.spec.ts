import { test, expect, APIRequestContext } from '@playwright/test';
import { waitForEmptyHome, goToTab, createGenerator } from './helpers';

/**
 * End-to-end cloud sync against the local Firebase Emulator Suite.
 *
 * Runs only inside `npm run test:e2e:emu` (FIREBASE_EMULATOR=1), which starts the
 * Auth + Firestore emulators and serves the web app with
 * EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true. Nothing here touches the real project.
 */
const PROJECT = 'demo-generatortracker';
const AUTH = 'http://localhost:9099';
const FIRESTORE = `http://localhost:8080/v1/projects/${PROJECT}/databases/(default)`;
// The emulators accept any bearer token; "owner" bypasses security rules.
const ADMIN_HEADERS = { Authorization: 'Bearer owner' };

const listGeneratorNames = async (request: APIRequestContext): Promise<string[]> => {
  const response = await request.post(`${FIRESTORE}/documents:runQuery`, {
    headers: ADMIN_HEADERS,
    data: { structuredQuery: { from: [{ collectionId: 'generators', allDescendants: true }] } },
  });
  const rows = (await response.json()) as Array<{ document?: { fields?: { name?: { stringValue?: string } } } }>;
  return rows.map(row => row.document?.fields?.name?.stringValue).filter((n): n is string => !!n);
};

const findUid = async (request: APIRequestContext, email: string): Promise<string> => {
  const response = await request.post(
    `${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:query`,
    { headers: ADMIN_HEADERS, data: {} }
  );
  const body = (await response.json()) as { userInfo?: Array<{ localId: string; email?: string }> };
  const user = body.userInfo?.find(u => u.email === email);
  if (!user) throw new Error(`No emulator account for ${email}`);
  return user.localId;
};

test.describe('Cloud sync against the Firebase emulators', () => {
  test.skip(
    process.env.FIREBASE_EMULATOR !== '1',
    'Run with `npm run test:e2e:emu` (starts the emulators and sets FIREBASE_EMULATOR=1)'
  );

  test('sign up, push a local generator with Sync Now, then pull one created in the cloud', async ({
    page,
    request,
  }) => {
    const email = `e2e-${Date.now()}@example.test`;
    const password = 'e2e-only-password';

    await page.goto('/');
    await waitForEmptyHome(page);

    // Create an account through the app's own email/password form
    await goToTab(page, 'Settings');
    await page.getByTestId('auth-toggle-mode').click();
    await page.getByTestId('input-email').fill(email);
    await page.getByTestId('input-password').fill(password);
    await page.getByTestId('auth-submit').click();
    await expect(page.getByTestId('sign-out')).toBeVisible({ timeout: 30_000 });

    // Local change → sync queue → "Sync Now" pushes it to Firestore
    await goToTab(page, 'Home');
    await createGenerator(page, 'Pushed Gen');
    await goToTab(page, 'Settings');
    await page.getByTestId('sync-now').click();
    await expect.poll(() => listGeneratorNames(request), { timeout: 30_000 }).toContain('Pushed Gen');

    // A document written straight into Firestore reaches the device via the realtime listener
    const uid = await findUid(request, email);
    const now = new Date().toISOString();
    const write = await request.patch(`${FIRESTORE}/documents/users/${uid}/generators/remote-1`, {
      headers: ADMIN_HEADERS,
      data: {
        fields: {
          id: { stringValue: 'remote-1' },
          name: { stringValue: 'Pulled Gen' },
          purchaseDate: { stringValue: '2026-01-01' },
          createdAt: { stringValue: now },
          lastModified: { stringValue: now },
          syncStatus: { stringValue: 'synced' },
          userId: { stringValue: uid },
        },
      },
    });
    expect(write.ok()).toBe(true);

    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('@generators') || ''), { timeout: 30_000 })
      .toContain('Pulled Gen');
    await goToTab(page, 'Home');
    await expect(page.getByText('Pulled Gen').first()).toBeVisible();
  });
});
