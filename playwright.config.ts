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
  // The lite edition has its own server and config (playwright.lite.config.ts).
  testIgnore: /lite\.spec\.ts/,
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
    // Fail a missing element in seconds, not after the whole test timeout; the first
    // navigation waits for Metro to compile the bundle, hence the long navigation limit.
    actionTimeout: 15_000,
    navigationTimeout: 120_000,
  },
  // en-GB: an en-US browser would default the fuel unit to US gallons (region US); the specs expect litres.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], locale: 'en-GB' } }],
  webServer: {
    // --clear: the app config (edition) is baked into the web bundle and Metro's cache does not key on it.
    command: 'CI=1 BROWSER=none npx expo start --web --port 8081 --clear',
    url: 'http://localhost:8081',
    reuseExistingServer: !useEmulator,
    timeout: 180_000,
    env: useEmulator ? { EXPO_PUBLIC_USE_FIREBASE_EMULATOR: 'true' } : {},
  },
});
