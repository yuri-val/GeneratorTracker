// Pin the timezone so date tests are deterministic on every machine and in CI. A zone
// west of UTC exposes both local-vs-UTC bugs (S-10): in the evening the UTC date is
// already tomorrow, and 'YYYY-MM-DD' parsed as UTC midnight lands on the previous day.
// Set here (the parent process) so the Jest workers inherit it.
process.env.TZ = 'America/New_York';

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Unit tests for utilities + component tests. e2e (Playwright) lives under e2e/ and is excluded here.
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
};
