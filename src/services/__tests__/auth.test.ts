/**
 * Google sign-in must never crash the Settings screen when a build lacks the OAuth
 * client id for its platform (expo-auth-session throws during render in that case).
 * The jest-expo preset runs as iOS.
 */
const mockUseAuthRequest = jest.fn(() => [{ url: 'request' }, null, jest.fn()]);

jest.mock('expo-auth-session/providers/google', () => ({ useAuthRequest: mockUseAuthRequest }));
jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }));
jest.mock('firebase/auth', () => ({}));

const ENV_KEYS = ['EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID', 'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID', 'EXPO_PUBLIC_GOOGLE_CLIENT_ID'];
const saved: Record<string, string | undefined> = {};

const loadAuth = (): typeof import('../auth') => {
  let mod!: typeof import('../auth');
  jest.isolateModules(() => {
    mod = require('../auth');
  });
  return mod;
};

beforeEach(() => {
  mockUseAuthRequest.mockClear();
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

it('disables Google sign-in instead of throwing when the platform has no client id', async () => {
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID = 'web-only.apps.googleusercontent.com'; // not the iOS one

  const auth = loadAuth();
  const google = auth.useGoogleAuth();

  expect(auth.isGoogleAuthConfigured).toBe(false);
  expect(google).toMatchObject({ available: false, request: null, response: null });
  await expect(google.promptAsync()).resolves.toEqual({ type: 'dismiss' });
  expect(mockUseAuthRequest).not.toHaveBeenCalled();
});

it('uses expo-auth-session with every platform id when the current platform is configured', () => {
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'ios-id';
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID = 'android-id';
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID = 'web-id';

  const auth = loadAuth();
  const google = auth.useGoogleAuth();

  expect(auth.isGoogleAuthConfigured).toBe(true);
  expect(google.available).toBe(true);
  expect(mockUseAuthRequest).toHaveBeenCalledWith({
    iosClientId: 'ios-id',
    androidClientId: 'android-id',
    webClientId: 'web-id',
    responseType: 'id_token',
  });
});
