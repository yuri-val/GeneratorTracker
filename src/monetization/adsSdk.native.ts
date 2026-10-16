import * as sdk from 'react-native-google-mobile-ads';

export type AdsSdk = typeof sdk;
export const getAdsSdk = (): AdsSdk | null => sdk;
