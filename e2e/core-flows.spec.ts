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
    await expect(page.getByText('EU22i').first()).toBeVisible();
    await expect(page.getByText('0.0h').first()).toBeVisible();

    // Edit via the detail header
    await openGenerator(page, 'E2E Honda');
    await page.getByTestId('detail-edit-generator').click();
    const nameInput = page.getByTestId('input-generator-name');
    await expect(nameInput).toHaveValue('E2E Honda');
    await nameInput.fill('E2E Honda Renamed');
    await page.getByTestId('save-generator').click();
    await expect(page.getByText('E2E Honda Renamed').first()).toBeVisible();

    // Delete with confirmation
    await page.getByTestId('detail-delete-generator').click();
    await page.getByTestId('confirm-delete').click();
    await waitForEmptyHome(page);
  });

  test('start and stop a work session from the detail screen', async ({ page }) => {
    await page.goto('/');
    await waitForEmptyHome(page);
    await createGenerator(page, 'Session Gen');
    await openGenerator(page, 'Session Gen');

    await page.getByTestId('start-session').click();
    await expect(page.getByText('Session Running')).toBeVisible();
    await expect(page.getByTestId('stop-session')).toBeVisible();

    await page.getByTestId('stop-session').click();
    await expect(page.getByTestId('start-session')).toBeVisible();

    // The completed session shows up in the Sessions tab
    await expect(page.getByRole('tab', { name: /Sessions \(1\)/ }).first()).toBeVisible();
    await openDetailTab(page, 'Sessions');
    // A completed session row shows "start - end"; the stats card and the row both read 0.0h
    await expect(visibleText(page, /^\d{1,2}:\d{2} (AM|PM) - \d{1,2}:\d{2} (AM|PM)$/)).toBeVisible();
    await expect(visibleText(page, '0.0h', true)).toHaveCount(2);
  });

  test('add a refill and see it reflected in stats and analytics', async ({ page }) => {
    await page.goto('/');
    await waitForEmptyHome(page);
    await createGenerator(page, 'Refill Gen');
    await openGenerator(page, 'Refill Gen');

    await openDetailTab(page, 'Refills');
    await page.getByText('Add Refill', { exact: true }).first().click();
    await page.getByTestId('input-refill-amount').fill('12.5');
    await page.getByTestId('save-refill').click();

    await expect(page.getByRole('tab', { name: /Refills \(1\)/ }).first()).toBeVisible();
    await openDetailTab(page, 'Refills');
    await expect(visibleText(page, '12.5L')).toBeVisible();

    await goBack(page);
    await goToTab(page, 'Analytics');
    await expect(visibleText(page, 'LITERS USED')).toBeVisible();
    await expect(visibleText(page, '12.5', true)).toBeVisible();
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
    await expect(page.getByText('12.0h').first()).toBeVisible();
    await expect(page.getByText('2.5h').first()).toBeVisible();

    await goToTab(page, 'Analytics');
    await expect(visibleText(page, '14.5', true)).toBeVisible(); // total hours
    await expect(visibleText(page, '30.0', true)).toBeVisible(); // litres used

    // Per-generator filter narrows the totals. Inactive bottom-tab screens stay laid out
    // on web, so target the filter Chip by its button role rather than by text.
    await page.getByRole('button', { name: 'Beta', exact: true }).click();
    // With a single generator selected both TOTAL HOURS and AVG HOURS/GEN read 2.5
    await expect(visibleText(page, '2.5', true)).toHaveCount(2);
    await expect(visibleText(page, '10.0', true)).toBeVisible();

    // Charts view renders the chart cards
    await visibleText(page, 'Charts', true).click();
    await expect(page.getByText('Operating Hours (last 6 months)')).toBeVisible();
    await expect(page.getByText('Fuel Consumption (last 6 months)')).toBeVisible();
  });
});
