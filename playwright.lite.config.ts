import { defineConfig, devices } from '@playwright/test';

/**
 * Lite-edition e2e (`npm run test:e2e:lite`): the web build served with
 * EXPO_PUBLIC_EDITION=lite on its own port, so the fake store and the limits are active.
 * Only e2e/lite.spec.ts runs here; the regular suites run against the full edition.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /lite\.spec\.ts/,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8084',
    headless: true,
    trace: 'on-first-retry',
    actionTimeout: 15_000,
    navigationTimeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // --clear: Metro's transform cache would otherwise serve the full edition's bundle (the config is baked in).
    command: 'CI=1 BROWSER=none npx expo start --web --port 8084 --clear',
    url: 'http://localhost:8084',
    reuseExistingServer: false,
    timeout: 180_000,
    env: { EXPO_PUBLIC_EDITION: 'lite' },
  },
});
