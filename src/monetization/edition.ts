import { Platform } from 'react-native';
import Constants from 'expo-constants';

export type Edition = 'full' | 'lite';

/**
 * Which edition this build is (app.config.js):
 * - full: the paid Android app — no ads, no limits, no purchases;
 * - lite: free with ads and limits, removable with in-app purchases (iOS, "Generator Tracker Lite" on Android).
 */
const configured = Constants.expoConfig?.extra?.edition as Partial<Record<string, Edition>> | undefined;
export const EDITION: Edition = configured?.[Platform.OS] ?? 'full';
export const isLite = EDITION === 'lite';

/**
 * The fake store stands in for the App Store / Google Play where there is none: the web
 * build, Jest and dev builds started with EXPO_PUBLIC_FAKE_STORE=true. Purchases succeed
 * instantly and live only in AsyncStorage.
 */
export const useFakeStore = Platform.OS === 'web' || process.env.EXPO_PUBLIC_FAKE_STORE === 'true';
