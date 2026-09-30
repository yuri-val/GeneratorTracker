/**
 * Firestore security rules tests. They need the Firestore emulator, so run them with
 * `npm run test:rules` (wraps jest in `firebase emulators:exec`).
 * @type {import('jest').Config}
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/rules-tests/**/*.test.ts'],
  testTimeout: 30000,
};
