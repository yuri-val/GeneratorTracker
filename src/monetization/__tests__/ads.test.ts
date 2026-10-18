/**
 * initAds: consent first, then App Tracking Transparency (iOS), then the SDK. The ATT prompt must
 * appear even when the UMP consent request fails or serves no IDFA explainer — an app that declares
 * NSUserTrackingUsageDescription has to ask (found on a TestFlight build of 3.1.0). Jest runs as iOS.
 */
const calls: string[] = [];
const mockGather = jest.fn();
const mockInitialize = jest.fn(async () => {
  calls.push('initialize');
  return [];
});
const mockGetTracking = jest.fn();
const mockRequestTracking = jest.fn(async () => {
  calls.push('att');
  return { status: 'granted' };
});

jest.mock('../edition', () => ({ isLite: true, useFakeStore: true, EDITION: 'lite' }));
jest.mock('expo-tracking-transparency', () => ({
  getTrackingPermissionsAsync: mockGetTracking,
  requestTrackingPermissionsAsync: mockRequestTracking,
}));
jest.mock('react-native-google-mobile-ads', () => ({
  __esModule: true,
  default: () => ({ initialize: mockInitialize }),
  AdsConsent: { gatherConsent: mockGather },
  AdsConsentPrivacyOptionsRequirementStatus: { REQUIRED: 'REQUIRED', NOT_REQUIRED: 'NOT_REQUIRED' },
}));

const loadAds = (): typeof import('../ads') => {
  let mod!: typeof import('../ads');
  jest.isolateModules(() => {
    mod = require('../ads');
  });
  return mod;
};

beforeEach(() => {
  calls.length = 0;
  jest.clearAllMocks();
  mockGetTracking.mockResolvedValue({ status: 'undetermined', canAskAgain: true });
  mockGather.mockImplementation(async () => {
    calls.push('consent');
    return { canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED' };
  });
});

it('asks for consent, then for tracking, then starts the SDK', async () => {
  const status = await loadAds().initAds();

  expect(calls).toEqual(['consent', 'att', 'initialize']);
  expect(status).toEqual({ ready: true, privacyOptionsRequired: false });
});

it('still shows the tracking prompt when the consent request fails, and starts no ads', async () => {
  mockGather.mockRejectedValue(new Error('Error making request'));
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  const ads = loadAds();

  const status = await ads.initAds();

  expect(mockRequestTracking).toHaveBeenCalledTimes(1);
  expect(mockInitialize).not.toHaveBeenCalled();
  expect(status.ready).toBe(false);
  // The next screen that needs ads retries the consent request.
  mockGather.mockResolvedValue({ canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED' });
  mockGetTracking.mockResolvedValue({ status: 'denied', canAskAgain: false });
  expect((await ads.initAds()).ready).toBe(true);
});

it('does not ask again once the user has answered (e.g. through the UMP explainer)', async () => {
  mockGetTracking.mockResolvedValue({ status: 'denied', canAskAgain: false });

  await loadAds().initAds();

  expect(mockRequestTracking).not.toHaveBeenCalled();
  expect(mockInitialize).toHaveBeenCalled();
});

it('keeps ads off when consent says ads may not be requested', async () => {
  mockGather.mockResolvedValue({ canRequestAds: false, privacyOptionsRequirementStatus: 'REQUIRED' });

  const status = await loadAds().initAds();

  expect(mockInitialize).not.toHaveBeenCalled();
  expect(status).toEqual({ ready: false, privacyOptionsRequired: true });
});
