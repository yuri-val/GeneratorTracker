// Web: no AdMob SDK (its package imports React Native internals that do not exist on web).
// adsSdk.native.ts is the real one; Metro picks the file by platform.
export type AdsSdk = typeof import('react-native-google-mobile-ads');
export const getAdsSdk = (): AdsSdk | null => null;
