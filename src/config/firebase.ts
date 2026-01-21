import { initializeApp, FirebaseApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Firebase configuration from environment variables
const firebaseConfig = {
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

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  console.log('Initializing Firebase with config:', { 
    hasApiKey: !!firebaseConfig.apiKey,
    projectId: firebaseConfig.projectId 
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
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  // Re-throw with more context
  if (error instanceof Error) {
    throw new Error(`Firebase initialization failed: ${error.message}`);
  }
  throw error;
}

export { app, auth, db };
