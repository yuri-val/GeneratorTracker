// `firebase/auth` ships React Native-only exports (Metro resolves them through the
// package's "react-native" entry), but TypeScript picks the browser typings for the
// `firebase/auth` subpath and does not know about `getReactNativePersistence`.
// This augmentation restores the missing declaration; it has no runtime effect.
import type { Persistence, ReactNativeAsyncStorage } from 'firebase/auth';

declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}
