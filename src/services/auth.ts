import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithCredential,
  onAuthStateChanged,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User as FirebaseUser,
} from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { Platform } from 'react-native';
import { auth } from '../config/firebase';
import { User } from '../models/types';

// Enable web browser for auth session
WebBrowser.maybeCompleteAuthSession();

/**
 * Authentication Service
 * Handles all authentication operations including Google OAuth, email/password, and anonymous
 */

/**
 * Map Firebase User to our User type
 */
export const mapFirebaseUser = (firebaseUser: FirebaseUser): User => {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
  };
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return mapFirebaseUser(userCredential.user);
  } catch (error: any) {
    console.error('Email sign in error:', error);
    throw new Error(error.message || 'Failed to sign in with email');
  }
};

/**
 * Create account with email and password
 */
export const signUpWithEmail = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return mapFirebaseUser(userCredential.user);
  } catch (error: any) {
    console.error('Email sign up error:', error);
    throw new Error(error.message || 'Failed to create account');
  }
};

/**
 * Sign in anonymously
 */
export const signInAnonymouslyUser = async (): Promise<User> => {
  try {
    const userCredential = await signInAnonymously(auth);
    return mapFirebaseUser(userCredential.user);
  } catch (error: any) {
    console.error('Anonymous sign in error:', error);
    throw new Error(error.message || 'Failed to sign in anonymously');
  }
};

/**
 * Google OAuth client ids, one per platform (see .env.example). `expoClientId` no
 * longer exists in expo-auth-session v7; the web client id covers web builds.
 */
const GOOGLE_CLIENT_IDS = {
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  web: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
};

/**
 * expo-auth-session throws *during render* when the current platform has no client
 * id, which used to take the whole Settings screen down. Google sign-in is only
 * offered when this build has an id for the platform it runs on.
 */
// Not offered on iOS: App Store guideline 4.8 requires "Sign in with Apple" next to any
// third-party sign-in, so iOS offers email/password and anonymous sign-in only.
export const isGoogleAuthConfigured = !!Platform.select({
  ios: false,
  android: GOOGLE_CLIENT_IDS.android,
  default: GOOGLE_CLIENT_IDS.web,
});

const useConfiguredGoogleAuth = () => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_CLIENT_IDS.ios,
    androidClientId: GOOGLE_CLIENT_IDS.android,
    webClientId: GOOGLE_CLIENT_IDS.web,
    responseType: 'id_token', // Request ID token for Firebase Auth
  });
  return { request, response, promptAsync, available: true as const };
};

type GoogleAuth = Omit<ReturnType<typeof useConfiguredGoogleAuth>, 'available'> & { available: boolean };

const useUnavailableGoogleAuth = (): GoogleAuth => ({
  request: null,
  response: null,
  promptAsync: async () => ({ type: 'dismiss' }),
  available: false,
});

/**
 * Sign in with Google using expo-auth-session. The implementation is chosen once per
 * build (the client ids are inlined at build time), so the hook order never changes.
 */
export const useGoogleAuth: () => GoogleAuth = isGoogleAuthConfigured
  ? useConfiguredGoogleAuth
  : useUnavailableGoogleAuth;

/**
 * Complete Google sign in with the response from OAuth
 */
export const signInWithGoogleCredential = async (idToken: string): Promise<User> => {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    return mapFirebaseUser(userCredential.user);
  } catch (error: any) {
    console.error('Google sign in error:', error);
    throw new Error(error.message || 'Failed to sign in with Google');
  }
};

/**
 * Sign out current user
 */
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    console.error('Sign out error:', error);
    throw new Error(error.message || 'Failed to sign out');
  }
};

/** How the current user signed in — decides how account deletion confirms identity. */
export type AccountKind = 'password' | 'anonymous' | 'google' | 'other';

export const getAccountKind = (): AccountKind => {
  const user = auth.currentUser;
  if (!user) return 'other';
  if (user.isAnonymous) return 'anonymous';
  const providers = user.providerData.map(p => p.providerId);
  if (providers.includes('password')) return 'password';
  if (providers.includes('google.com')) return 'google';
  return 'other';
};

/** Firebase lets an account be deleted only within ~5 minutes of signing in. */
const RECENT_SIGN_IN_MS = 4 * 60 * 1000;

export const hasRecentSignIn = (): boolean => {
  const lastSignIn = auth.currentUser?.metadata.lastSignInTime;
  return !!lastSignIn && Date.now() - Date.parse(lastSignIn) < RECENT_SIGN_IN_MS;
};

/** Confirm the user's identity again with their password (throws auth/wrong-password etc.). */
export const reauthenticateWithPassword = async (password: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('No signed-in email account');
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
};

/** Delete the Firebase account itself (the caller deletes the cloud data first). */
export const deleteCurrentUser = async (): Promise<void> => {
  if (auth.currentUser) await deleteUser(auth.currentUser);
};

/**
 * Get current user
 */
export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return auth.currentUser !== null;
};

/**
 * Listen to auth state changes
 */
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, (firebaseUser) => {
    callback(firebaseUser ? mapFirebaseUser(firebaseUser) : null);
  });
};
