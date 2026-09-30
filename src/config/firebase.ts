import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
  connectAuthEmulator,
  Auth,
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Local Firebase Emulator Suite support (see docs/TESTING.md).
 *
 * With EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true the app talks to the local Auth and
 * Firestore emulators instead of the production project. The project id is forced
 * to a `demo-` id, so emulator mode can never reach real data.
 */
const useEmulator = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true';
const EMULATOR_PROJECT_ID = 'demo-generatortracker';
const EMULATOR_AUTH_PORT = Number(process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_AUTH_PORT || 9099);
const EMULATOR_FIRESTORE_PORT = Number(process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_FIRESTORE_PORT || 8080);

// Firebase configuration from environment variables (or emulator stand-ins)
const firebaseConfig = useEmulator
  ? {
      apiKey: 'demo-api-key',
      authDomain: 'localhost',
      projectId: EMULATOR_PROJECT_ID,
      storageBucket: `${EMULATOR_PROJECT_ID}.appspot.com`,
      messagingSenderId: '0',
      appId: '1:0:web:emulator',
    }
  : {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    };

// Validate Firebase configuration
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Firebase configuration is missing required fields');
  throw new Error('Firebase configuration is incomplete. Check your .env file.');
}

/**
 * Where the emulators run, from the app's point of view:
 * - an explicit EXPO_PUBLIC_FIREBASE_EMULATOR_HOST always wins (physical device on LAN);
 * - web and the iOS simulator reach the host machine as localhost;
 * - otherwise reuse the Metro dev-server host (LAN IP), which devices already reach;
 * - the Android emulator maps the host machine's loopback to 10.0.2.2.
 */
const resolveEmulatorHost = (): string => {
  const explicit = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;
  if (explicit) return explicit;
  if (Platform.OS === 'web') return 'localhost';
  const metroHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (metroHost && metroHost !== 'localhost' && metroHost !== '127.0.0.1') return metroHost;
  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  console.log('Initializing Firebase with config:', {
    hasApiKey: !!firebaseConfig.apiKey,
    projectId: firebaseConfig.projectId,
    emulator: useEmulator,
  });

  app = initializeApp(firebaseConfig);

  // Initialize Auth with platform-specific persistence
  if (Platform.OS === 'web') {
    // On web, use default persistence (localStorage)
    auth = getAuth(app);
  } else {
    // On React Native (iOS/Android), use AsyncStorage persistence
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }

  db = getFirestore(app);

  if (useEmulator) {
    const host = resolveEmulatorHost();
    connectAuthEmulator(auth, `http://${host}:${EMULATOR_AUTH_PORT}`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, EMULATOR_FIRESTORE_PORT);
    console.log(
      `Firebase emulators in use at ${host} (auth :${EMULATOR_AUTH_PORT}, firestore :${EMULATOR_FIRESTORE_PORT})`
    );
  }

  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  // Re-throw with more context
  if (error instanceof Error) {
    throw new Error(`Firebase initialization failed: ${error.message}`);
  }
  throw error;
}

/** True when the app is wired to the local Firebase emulators (never in store builds). */
export const isUsingFirebaseEmulator = useEmulator;

export { app, auth, db };
