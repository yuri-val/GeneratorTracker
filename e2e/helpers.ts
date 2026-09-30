import { Page, expect } from '@playwright/test';

/** The first web bundle compile is slow; give initial hydration extra room. */
export const HYDRATE_TIMEOUT = 90_000;

/** Wait until the app has rendered the (empty) Home screen. */
export const waitForEmptyHome = (page: Page) =>
  page.getByText('No generators yet').waitFor({ timeout: HYDRATE_TIMEOUT });

/** Switch bottom tab. Labels are the English defaults (Home / Analytics / Settings). */
export const goToTab = async (page: Page, label: 'Home' | 'Analytics' | 'Settings') => {
  await page.getByTestId(`tab-${label.toLowerCase()}`).click();
};

/** Create a generator through the UI and return to Home. */
export const createGenerator = async (page: Page, name: string, model?: string) => {
  await page.getByTestId('fab-add-generator').click();
  await page.getByTestId('input-generator-name').fill(name);
  if (model) {
    await page.getByTestId('input-generator-model').fill(model);
  }
  await page.getByTestId('save-generator').click();
  await expect(page.getByText(name).first()).toBeVisible();
};

/** Open a generator's detail screen from Home. */
export const openGenerator = (page: Page, name: string) => page.getByText(name).first().click();

/**
 * Leave the current stack screen (detail / modal) through its back button.
 * The bottom tab bar only exists on the MainTabs screen, so go back before goToTab().
 */
export const goBack = (page: Page) => page.getByRole('button', { name: 'Back' }).first().click();

/**
 * Screens below the top of the native stack stay in the DOM on web but are hidden;
 * use this to assert on text of the screen that is actually on top.
 */
export const visibleText = (page: Page, text: string | RegExp, exact = false) =>
  page.getByText(text, { exact }).filter({ visible: true });

/** Material top-tab labels render more than once on web; click the first match. */
export const openDetailTab = (page: Page, label: 'Sessions' | 'Refills' | 'Maintenance') =>
  page.getByRole('tab', { name: new RegExp(label) }).first().click();

/**
 * Seed the offline store before the app boots. Keys mirror src/utils/storage.ts
 * (`@generators`, `@work_sessions`, `@refills`, `@maintenance_tasks`); on web
 * AsyncStorage is backed by localStorage.
 */
export const seedLocalStorage = (page: Page, data: Record<string, unknown>) =>
  page.addInitScript((entries: [string, unknown][]) => {
    for (const [key, value] of entries) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, Object.entries(data));

const NOW = () => new Date().toISOString();

export const fixtures = {
  generator: (id: string, name: string, extra: Record<string, unknown> = {}) => ({
    id,
    name,
    purchaseDate: '2025-01-01',
    createdAt: NOW(),
    lastModified: NOW(),
    syncStatus: 'synced',
    ...extra,
  }),
  session: (id: string, generatorId: string, date: string, hours: number) => ({
    id,
    generatorId,
    date,
    startTime: '09:00',
    endTime: '12:00',
    hours,
    isActive: false,
    createdAt: NOW(),
    lastModified: NOW(),
    syncStatus: 'synced',
  }),
  refill: (id: string, generatorId: string, date: string, amount: number) => ({
    id,
    generatorId,
    date,
    amount,
    createdAt: NOW(),
    lastModified: NOW(),
    syncStatus: 'synced',
  }),
};
