import { test, expect, Page } from '@playwright/test';
import { createGenerator, goBack, goToTab, openDetailTab, openGenerator, visibleText, waitForEmptyHome } from './helpers';

/**
 * Lite edition (ads + limits + purchases) on the web build with the fake store:
 * `npm run test:e2e:lite` serves the app with EXPO_PUBLIC_EDITION=lite. Ads themselves
 * are native-only and not rendered on web; what is tested is the gating and the paywall.
 */
test.describe('Lite edition', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForEmptyHome(page);
  });

  const addTask = async (page: Page, title: string) => {
    await page.getByTestId('detail-add-maintenance').click();
    await page.getByTestId('input-maintenance-title').fill(title);
    await page.getByTestId('input-maintenance-hours').fill('100');
    await page.getByTestId('save-maintenance').click();
    await expect(visibleText(page, title)).toBeVisible();
  };

  test('the fourth generator opens the paywall; "Unlimited" lifts the limit', async ({ page }) => {
    await createGenerator(page, 'Gen 1');
    await createGenerator(page, 'Gen 2');
    await createGenerator(page, 'Gen 3');

    await page.getByTestId('fab-add-generator').click();
    await expect(page.getByTestId('upgrade-reason')).toContainText('up to 3 generators');
    await expect(page.getByTestId('buy-gt_everything')).toContainText('$1.49');
    await expect(page.getByTestId('buy-gt_unlimited')).toContainText('$0.99');

    await page.getByTestId('buy-gt_unlimited').click();
    await expect(page.getByTestId('snackbar-purchased')).toBeVisible();
    await createGenerator(page, 'Gen 4');

    // The purchase shows in Settings; "Remove ads" is still available.
    await goToTab(page, 'Settings');
    await expect(page.getByTestId('purchases-status')).toContainText('Limits removed');
    await expect(page.getByTestId('open-upgrade')).toBeVisible();
  });

  test('the third maintenance task of a generator opens the paywall', async ({ page }) => {
    await createGenerator(page, 'Honda');
    await openGenerator(page, 'Honda');
    await openDetailTab(page, 'Maintenance');
    await addTask(page, 'Oil change');
    await addTask(page, 'Air filter');

    await page.getByTestId('detail-add-maintenance').click();
    await expect(page.getByTestId('upgrade-reason')).toContainText('up to 2 maintenance tasks');
    await page.getByTestId('upgrade-close').click();
    await goBack(page);
  });

  test('"Everything" marks all products as owned and hides the Settings upsell', async ({ page }) => {
    await goToTab(page, 'Settings');
    await page.getByTestId('open-upgrade').click();
    // Opened without a limit: the general intro, with the limits filled in.
    await expect(page.getByTestId('upgrade-reason')).toContainText('up to 3 generators with 2 maintenance tasks');
    await expect(page.getByTestId('upgrade-reason')).not.toContainText('{{');
    await page.getByTestId('buy-gt_everything').click();
    await expect(page.getByTestId('snackbar-purchased')).toBeVisible();
    await expect(page.getByTestId('purchases-status')).toContainText('Ads and limits removed');
    await expect(page.getByTestId('open-upgrade')).toHaveCount(0);

    // Restore reports the owned products and the paywall shows everything as purchased.
    await page.getByTestId('restore-purchases-settings').click();
    await expect(page.getByTestId('snackbar-restored')).toContainText('Purchases restored');
  });
});
