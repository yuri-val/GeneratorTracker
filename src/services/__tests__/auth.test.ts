/**
 * Google sign-in must never crash the Settings screen when a build lacks the OAuth
 * client id for its platform (expo-auth-session throws during render in that case).
 * Android signs in natively (the browser flow is rejected there), web through
 * expo-auth-session, iOS not at all. The jest-expo preset runs as iOS.
 */
const mockUseAuthRequest = jest.fn(() => [{ url: 'request' }, null, jest.fn()]);
const mockNativeSignIn = jest.fn();
const mockNativeSignOut = jest.fn(async () => {});
const mockFirebaseSignOut = jest.fn(async () => {});
const mockSetResponse = jest.fn();

jest.mock('expo-auth-session/providers/google', () => ({ useAuthRequest: mockUseAuthRequest }));
jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }));
jest.mock('firebase/auth', () => ({ signOut: mockFirebaseSignOut }));

const ENV_KEYS = ['EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID', 'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID', 'EXPO_PUBLIC_GOOGLE_CLIENT_ID'];
const saved: Record<string, string | undefined> = {};

const loadAuth = (platform?: 'android' | 'web'): typeof import('../auth') => {
  let mod!: typeof import('../auth');
  jest.isolateModules(() => {
    if (platform) {
      jest.doMock('react-native', () => ({
        Platform: { OS: platform, select: (spec: Record<string, unknown>) => (platform in spec ? spec[platform] : spec.default) },
      }));
    }
    if (platform === 'android') {
      // What Metro resolves on Android (googleSignInNative.android.ts), without the native module.
      jest.doMock('../googleSignInNative', () => ({
        hasNativeGoogleSignIn: true,
        nativeGoogleSignIn: mockNativeSignIn,
        nativeGoogleSignOut: mockNativeSignOut,
      }));
      // Lets the hook run outside a component.
      jest.doMock('react', () => ({
        ...jest.requireActual('react'),
        useState: (initial: unknown) => [initial, mockSetResponse],
        useCallback: (fn: unknown) => fn,
      }));
    }
    mod = require('../auth');
  });
  return mod;
};

beforeEach(() => {
  mockUseAuthRequest.mockClear();
  mockNativeSignIn.mockReset();
  mockNativeSignOut.mockClear();
  mockFirebaseSignOut.mockClear();
  mockSetResponse.mockClear();
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

it('never offers Google sign-in on iOS, even with an iOS client id (App Store guideline 4.8)', () => {
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'ios-id';

  const auth = loadAuth();

  expect(auth.isGoogleAuthConfigured).toBe(false);
  expect(auth.useGoogleAuth().available).toBe(false);
  expect(mockUseAuthRequest).not.toHaveBeenCalled();
});

it('uses the expo-auth-session browser flow with the web client id on web', () => {
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID = 'web-id';

  const auth = loadAuth('web');
  const google = auth.useGoogleAuth();

  expect(auth.isGoogleAuthConfigured).toBe(true);
  expect(google.available).toBe(true);
  expect(mockUseAuthRequest).toHaveBeenCalledWith({ webClientId: 'web-id', responseType: 'id_token' });
});

describe('Android', () => {
  it('signs in natively and hands Settings the ID token issued for the web client', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID = 'web-id';
    mockNativeSignIn.mockResolvedValue({ type: 'success', idToken: 'token-1' });

    const auth = loadAuth('android');
    const google = auth.useGoogleAuth();
    const result = await google.promptAsync();

    expect(auth.isGoogleAuthConfigured).toBe(true);
    expect(google).toMatchObject({ available: true, response: null });
    expect(google.request).not.toBeNull();
    expect(mockNativeSignIn).toHaveBeenCalledWith('web-id');
    expect(mockUseAuthRequest).not.toHaveBeenCalled();
    expect(result).toMatchObject({ type: 'success', params: { id_token: 'token-1' } });
    expect(mockSetResponse).toHaveBeenCalledWith(result);
  });

  it('treats a closed account picker as a dismissal, not an error', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID = 'web-id';
    mockNativeSignIn.mockResolvedValue({ type: 'cancel' });

    const result = await loadAuth('android').useGoogleAuth().promptAsync();

    expect(result).toEqual({ type: 'dismiss' });
  });

  it('reports native failures (e.g. an unregistered signing key) as an error response', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID = 'web-id';
    const failure = Object.assign(new Error('DEVELOPER_ERROR'), { code: '10' });
    mockNativeSignIn.mockRejectedValue(failure);
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await loadAuth('android').useGoogleAuth().promptAsync();

    expect(result).toMatchObject({ type: 'error', errorCode: '10', error: failure });
  });

  it('is not offered without the web client id', () => {
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID = 'android-id'; // not used any more

    const auth = loadAuth('android');

    expect(auth.isGoogleAuthConfigured).toBe(false);
    expect(auth.useGoogleAuth().available).toBe(false);
  });

  it('forgets the Google account on sign out so the picker shows next time', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID = 'web-id';

    await loadAuth('android').signOut();

    expect(mockNativeSignOut).toHaveBeenCalled();
    expect(mockFirebaseSignOut).toHaveBeenCalled();
  });
});
