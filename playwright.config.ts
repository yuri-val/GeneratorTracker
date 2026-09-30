import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests run against the Expo **web** build of the app.
 * Start the web server with `npm run web` (port 8081) or let Playwright start it.
 * The first web bundle is slow to compile, hence the generous timeouts.
 *
 * `npm run test:e2e:emu` sets FIREBASE_EMULATOR=1: the web app is then served in
 * Firebase-emulator mode and the cloud-sync spec is included. Always let Playwright
 * start its own server in that mode so the bundle picks up the emulator flag.
 */
const useEmulator = process.env.FIREBASE_EMULATOR === '1';

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://localhost:8081',
    headless: true,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'CI=1 BROWSER=none npx expo start --web --port 8081',
    url: 'http://localhost:8081',
    reuseExistingServer: !useEmulator,
    timeout: 180_000,
    env: useEmulator ? { EXPO_PUBLIC_USE_FIREBASE_EMULATOR: 'true' } : {},
  },
});
