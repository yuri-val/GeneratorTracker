import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests run against the Expo **web** build of the app.
 * Start the web server with `npm run web` (port 8081) or let Playwright start it.
 * The first web bundle is slow to compile, hence the generous timeouts.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8081',
    headless: true,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'CI=1 BROWSER=none npx expo start --web --port 8081',
    url: 'http://localhost:8081',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
