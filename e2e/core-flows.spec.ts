import { test, expect } from '@playwright/test';
import {
  waitForEmptyHome,
  goToTab,
  goBack,
  createGenerator,
  openGenerator,
  openDetailTab,
  seedLocalStorage,
  visibleText,
  fixtures,
  HYDRATE_TIMEOUT,
} from './helpers';

test.describe('Core flows (web e2e)', () => {
  test('create, edit and delete a generator', async ({ page }) => {
    await page.goto('/');
    await waitForEmptyHome(page);

    await createGenerator(page, 'E2E Honda', 'EU22i');
    // A generator without sessions shows its model under the name and an idle Start button.
    await expect(page.getByText('EU22i').first()).toBeVisible();
    await expect(page.getByTestId('home-summary')).toHaveText('1 generator · all off');

    // Edit via the detail app bar
    await openGenerator(page, 'E2E Honda');
    await page.getByTestId('detail-edit-action').click();
    const nameInput = page.getByTestId('input-generator-name');
    await expect(nameInput).toHaveValue('E2E Honda');
    await nameInput.fill('E2E Honda Renamed');
    await page.getByTestId('save-generator').click();
    await expect(visibleText(page, 'E2E Honda Renamed').first()).toBeVisible();

    // Delete with confirmation
    await page.getByTestId('detail-delete-generator').click();
    await page.getByTestId('confirm-delete').click();
    await waitForEmptyHome(page);
  });

  test('detail screen: start → stop → undo → stop', async ({ page }) => {
    await page.goto('/');
    await waitForEmptyHome(page);
    await createGenerator(page, 'Session Gen');
    await openGenerator(page, 'Session Gen');

    await page.getByTestId('start-session').click();
    await expect(page.getByTestId('session-card-running')).toBeVisible();
    await expect(visibleText(page, 'Session running')).toBeVisible();
    await expect(page.getByTestId('session-clock')).toHaveText(/^0:00:\d{2}$/);

    // Stop has no confirmation; the snackbar offers Undo for 5 s
    await page.getByTestId('stop-session').click();
    await expect(page.getByTestId('start-session')).toBeVisible();
    await expect(page.getByTestId('snackbar-stopped')).toContainText('Logged 0.0 h · Session Gen');
    await page.getByTestId('snackbar-action').click();
    await expect(page.getByTestId('stop-session')).toBeVisible();
    await expect(page.getByTestId('detail-tab-sessions')).toContainText('0');

    await page.getByTestId('stop-session').click();
    await expect(page.getByTestId('start-session')).toBeVisible();
    await expect(page.getByTestId('detail-tab-sessions')).toContainText('1');
    await openDetailTab(page, 'Sessions');
    await expect(visibleText(page, /^\d{1,2}:\d{2}\s?(AM|PM)?\s–\s\d{1,2}:\d{2}\s?(AM|PM)?$/).first()).toBeVisible();
  });

  test('home: start and stop from the list, undo restores the running card', async ({ page }) => {
    await page.goto('/');
    await waitForEmptyHome(page);
    await createGenerator(page, 'Home Gen');
    const card = page.locator('[data-testid^="home-card-"]').first();
    const id = (await card.getAttribute('data-testid'))!.replace('home-card-', '');

    await page.getByTestId(`home-start-${id}`).click();
    await expect(page.getByTestId(`home-stop-${id}`)).toBeVisible();
    await expect(page.getByTestId(`home-timer-${id}`)).toHaveText(/0\sh 0\smin/);
    await expect(page.getByTestId('home-summary')).toHaveText('1 generator · 1 running');

    await page.getByTestId(`home-stop-${id}`).click();
    await expect(page.getByTestId(`home-start-${id}`)).toBeVisible();
    await page.getByTestId('snackbar-action').click();
    await expect(page.getByTestId(`home-stop-${id}`)).toBeVisible();
    await expect(page.getByTestId('home-summary')).toHaveText('1 generator · 1 running');
  });

  test('two generators running at once; the live bar stops the other one', async ({ page }) => {
    await page.goto('/');
    await waitForEmptyHome(page);
    await createGenerator(page, 'First Gen');
    await createGenerator(page, 'Second Gen');

    // A started generator moves to the top, so always press the first remaining Start.
    const starts = page.locator('[data-testid^="home-start-"]');
    await starts.first().click();
    await expect(starts).toHaveCount(1);
    await starts.first().click();
    await expect(starts).toHaveCount(0);
    await expect(page.getByTestId('home-summary')).toHaveText('2 generators · 2 running');
    await expect(page.locator('[data-testid^="home-stop-"]')).toHaveCount(2);

    await openGenerator(page, 'First Gen');
    const bar = page.getByTestId('live-bar').filter({ visible: true });
    await expect(bar).toContainText('Second Gen');
    await page.getByTestId('live-bar-stop').filter({ visible: true }).click();
    await expect(bar).toHaveCount(0);
    await expect(page.getByTestId('stop-session')).toBeVisible(); // this one keeps running

    await goBack(page);
    await expect(page.getByTestId('home-summary')).toHaveText('2 generators · 1 running');
  });

  test('refill while running: stop and refill → save → start again', async ({ page }) => {
    await page.goto('/');
    await waitForEmptyHome(page);
    await createGenerator(page, 'Tank Gen', undefined, 3.6);
    await openGenerator(page, 'Tank Gen');
    await page.getByTestId('start-session').click();
    await expect(page.getByTestId('stop-session')).toBeVisible();

    await openDetailTab(page, 'Refills');
    await page.getByTestId('detail-add-refills').click();
    await expect(page.getByTestId('refill-running-banner')).toBeVisible();
    await expect(page.getByTestId('save-refill')).toHaveCount(0);

    await page.getByTestId('stop-and-refill').click();
    await expect(page.getByTestId('refill-running-banner')).toHaveCount(0);
    // Level unknown before the first full refill → defaults to a full tank
    await expect(page.getByTestId('input-refill-amount')).toHaveValue('3.6');
    await expect(page.getByTestId('refill-marked-full')).toHaveAttribute('aria-checked', 'true');
    await page.getByTestId('save-refill').click();

    await expect(page.getByTestId('snackbar-refill-saved')).toContainText('Refill saved');
    await page.getByTestId('snackbar-action').click();
    await expect(page.getByTestId('stop-session')).toBeVisible();
    await expect(page.getByTestId('detail-tab-refills')).toContainText('1');
    await expect(page.getByTestId('detail-tab-sessions')).toContainText('1');
  });

  test('add a refill and see it reflected in analytics', async ({ page }) => {
    await page.goto('/');
    await waitForEmptyHome(page);
    await createGenerator(page, 'Refill Gen');
    await openGenerator(page, 'Refill Gen');

    await openDetailTab(page, 'Refills');
    await page.getByText('Add Refill', { exact: true }).first().click();
    await page.getByTestId('input-refill-amount').fill('12.5');
    await page.getByTestId('save-refill').click();

    await expect(page.getByTestId('detail-tab-refills')).toContainText('1');
    await expect(visibleText(page, /^12\.5/).first()).toBeVisible();

    await goBack(page);
    await goToTab(page, 'Analytics');
    await expect(page.getByTestId('analytics-total-fuel')).toHaveText('12.5');
    await expect(page.getByTestId('chart-fuel')).toBeVisible();
  });

  test('switching the language persists across reloads', async ({ page }) => {
    await page.goto('/');
    await waitForEmptyHome(page);

    await goToTab(page, 'Settings');
    await page.getByTestId('lang-uk').click();
    await expect(page.getByText('Налаштування').first()).toBeVisible();

    await page.reload();
    await expect(page.getByText('Генераторів ще немає')).toBeVisible({ timeout: HYDRATE_TIMEOUT });

    await page.getByTestId('tab-settings').click();
    await page.getByTestId('lang-en').click();
    await expect(page.getByText('Settings').first()).toBeVisible();
  });

  test('seeded history renders on Home and in Analytics', async ({ page }) => {
    await seedLocalStorage(page, {
      '@generators': [fixtures.generator('g-a', 'Alpha'), fixtures.generator('g-b', 'Beta')],
      '@work_sessions': [
        fixtures.session('s1', 'g-a', '2026-05-10', 4),
        fixtures.session('s2', 'g-a', '2026-06-01', 8),
        fixtures.session('s3', 'g-b', '2026-06-02', 2.5),
      ],
      '@refills': [fixtures.refill('r1', 'g-a', '2026-05-11', 20), fixtures.refill('r2', 'g-b', '2026-06-03', 10)],
    });

    await page.goto('/');
    await page.getByText('Alpha').waitFor({ timeout: HYDRATE_TIMEOUT });
    await expect(page.getByTestId('home-summary')).toHaveText('2 generators · all off');
    await expect(page.getByText(/^Last session Jun 1/).first()).toBeVisible();
    await expect(page.getByText(/^Last session Jun 2/).first()).toBeVisible();

    await goToTab(page, 'Analytics');
    await expect(page.getByTestId('analytics-total-hours')).toHaveText('14.5');
    await expect(page.getByTestId('analytics-total-fuel')).toHaveText('30.0');
    await expect(page.getByTestId('analytics-lph')).toHaveText('2.07');
    // Per-generator list, busiest first, and the filter narrows the totals.
    await expect(page.getByTestId('analytics-row-g-a')).toContainText('12.0');
    await expect(page.getByTestId('analytics-row-g-b')).toContainText('2.5');
    await page.getByTestId('filter-g-b').filter({ visible: true }).click();
    await expect(page.getByTestId('analytics-total-hours')).toHaveText('2.5');
    await expect(page.getByTestId('analytics-total-fuel')).toHaveText('10.0');
    await expect(page.getByTestId('analytics-row-g-a')).toHaveCount(0);
  });
});
