// Jest setup: runs after the test framework is installed in the environment.

// Mock AsyncStorage with the official in-memory mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// expo-haptics is a no-op in tests.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Heavy: 'Heavy', Medium: 'Medium', Light: 'Light' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

// src/config/firebase initialises Firebase at import time (and throws without a
// .env). Unit tests never talk to Firebase, so replace the singletons with stubs.
jest.mock('./src/config/firebase', () => ({
  app: {},
  auth: { currentUser: null },
  db: {},
  isUsingFirebaseEmulator: false,
}));

// The AdMob and billing SDKs are native-only; unit tests cover the logic around them.
jest.mock('react-native-google-mobile-ads', () => ({
  __esModule: true,
  default: () => ({ initialize: jest.fn().mockResolvedValue([]) }),
  AdsConsent: { gatherConsent: jest.fn().mockResolvedValue({ canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED' }), showPrivacyOptionsForm: jest.fn() },
  AdsConsentPrivacyOptionsRequirementStatus: { REQUIRED: 'REQUIRED', NOT_REQUIRED: 'NOT_REQUIRED', UNKNOWN: 'UNKNOWN' },
  AdEventType: { LOADED: 'loaded', CLOSED: 'closed', ERROR: 'error' },
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER' },
  BannerAd: () => null,
  InterstitialAd: { createForAdRequest: () => ({ addAdEventListener: jest.fn(), load: jest.fn(), show: jest.fn() }) },
  TestIds: {},
}));
jest.mock('expo-iap', () => ({
  initConnection: jest.fn().mockResolvedValue(true),
  endConnection: jest.fn().mockResolvedValue(true),
  fetchProducts: jest.fn().mockResolvedValue([]),
  getAvailablePurchases: jest.fn().mockResolvedValue([]),
  finishTransaction: jest.fn().mockResolvedValue(undefined),
  requestPurchase: jest.fn().mockResolvedValue(null),
  purchaseUpdatedListener: jest.fn(() => ({ remove: jest.fn() })),
  purchaseErrorListener: jest.fn(() => ({ remove: jest.fn() })),
}));
