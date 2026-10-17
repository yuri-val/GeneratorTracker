import { isLite } from './edition';

export type AdsSdk = typeof import('react-native-google-mobile-ads');

let sdk: AdsSdk | null | undefined;

/**
 * The AdMob SDK, loaded on first use and only in the lite edition. The paid Android app is built
 * without the native module (react-native.config.js), so requiring the package there would throw.
 */
export const getAdsSdk = (): AdsSdk | null => {
  if (sdk === undefined) sdk = isLite ? (require('react-native-google-mobile-ads') as AdsSdk) : null;
  return sdk;
};
