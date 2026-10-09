import { test, expect, Page } from '@playwright/test';
import { visibleText } from './helpers';

// First bundle compile can be slow; give the initial hydration extra room.
const HYDRATE_TIMEOUT = 90_000;

const waitForApp = async (page: Page) => {
  await page.getByText('No generators yet').waitFor({ timeout: HYDRATE_TIMEOUT });
};

const openMaintenanceTab = (page: Page) => page.getByTestId('detail-tab-maintenance').first().click();

test.describe('Maintenance feature (web e2e)', () => {
  test('create a generator and a maintenance task via the UI', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);

    // Create a generator
    await page.locator('[data-testid="fab-add-generator"]').click();
    await page.locator('[data-testid="input-generator-name"]').fill('E2E Generator');
    await page.locator('[data-testid="save-generator"]').click();

    // Open it
    await page.getByText('E2E Generator').first().click();

    // Go to the Maintenance tab (label like "Maintenance (0)")
    await openMaintenanceTab(page);

    // Add a maintenance task
    await page.getByText('Add Maintenance Task').click();
    await page.locator('[data-testid="input-maintenance-title"]').fill('Oil change');
    await page.locator('[data-testid="input-maintenance-hours"]').fill('250');
    await page.locator('[data-testid="save-maintenance"]').click();

    // Back on the detail screen — ensure the Maintenance tab content is visible
    await openMaintenanceTab(page);
    await expect(page.getByText('Oil change').first()).toBeVisible();
    // A fresh generator (0 engine hours) is well within the interval: the full interval is left
    await expect(page.getByText('250 h left').first()).toBeVisible();
  });

  test('an overdue task reads "Due now" and resets to "OK" after servicing', async ({ page }) => {
    // Seed an overdue (date-based) maintenance task directly into web storage.
    await page.addInitScript(() => {
      const now = new Date().toISOString();
      localStorage.setItem(
        '@generators',
        JSON.stringify([
          {
            id: 'g-seed',
            name: 'Seeded Gen',
            purchaseDate: '2025-01-01',
            createdAt: now,
            lastModified: now,
            syncStatus: 'synced',
          },
        ])
      );
      localStorage.setItem(
        '@maintenance_tasks',
        JSON.stringify([
          {
            id: 'm-seed',
            generatorId: 'g-seed',
            title: 'Seeded Service',
            intervalDays: 30,
            lastServiceHours: 0,
            lastServiceDate: '2025-01-01', // long overdue
            createdAt: now,
            lastModified: now,
            syncStatus: 'synced',
          },
        ])
      );
    });

    await page.goto('/');
    await page.getByText('Seeded Gen').waitFor({ timeout: HYDRATE_TIMEOUT });

    // Home row surfaces the overdue task with the ▲ cue
    await expect(page.getByTestId('home-maintenance-g-seed')).toContainText('▲ Seeded Service · ');
    await expect(page.getByTestId('home-maintenance-g-seed')).toContainText('days overdue');

    // Open the generator and go to Maintenance
    await page.getByText('Seeded Gen').first().click();
    await openMaintenanceTab(page);

    await expect(visibleText(page, 'Seeded Service', true).first()).toBeVisible();
    await expect(visibleText(page, /^▲ \d+ days overdue$/).first()).toBeVisible();

    // Mark it serviced -> resets to today -> the whole interval is left
    await page.getByTestId('mark-serviced-m-seed').click();
    await expect(visibleText(page, '30 days left').first()).toBeVisible();
    await expect(visibleText(page, /days overdue/)).toHaveCount(0);
  });
});
