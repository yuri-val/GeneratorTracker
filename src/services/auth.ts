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
import type { AuthSessionResult } from 'expo-auth-session';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { auth } from '../config/firebase';
import { User } from '../models/types';
import { hasNativeGoogleSignIn, nativeGoogleSignIn, nativeGoogleSignOut } from './googleSignInNative';

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
 * The web OAuth client id (see .env.example). Both platforms that offer Google sign-in use it:
 * web as the client of the browser flow, Android as the audience of the ID token returned by
 * the native SDK (the Android OAuth clients only verify the package name and signing key).
 */
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

/**
 * Google sign-in is only offered when this build can complete it: expo-auth-session throws
 * *during render* without a client id, which used to take the whole Settings screen down.
 */
// Not offered on iOS: App Store guideline 4.8 requires "Sign in with Apple" next to any
// third-party sign-in, so iOS offers email/password and anonymous sign-in only.
export const isGoogleAuthConfigured = !!Platform.select({
  ios: false,
  android: hasNativeGoogleSignIn && GOOGLE_WEB_CLIENT_ID,
  default: GOOGLE_WEB_CLIENT_ID,
});

type GoogleAuth = {
  /** Non-null once a sign-in can be started. */
  request: object | null;
  /** The result of the last attempt, shaped like expo-auth-session's (Settings reads `params.id_token`). */
  response: AuthSessionResult | null;
  promptAsync: () => Promise<AuthSessionResult>;
  available: boolean;
};

/** Web: expo-auth-session's browser flow, asking Google for the ID token directly. */
const useBrowserGoogleAuth = (): GoogleAuth => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    responseType: 'id_token', // Request ID token for Firebase Auth
  });
  return { request, response, promptAsync: () => promptAsync(), available: true };
};

const NATIVE_REQUEST = {};

/** Android: the native account picker (googleSignInNative.android.ts). */
const useNativeGoogleAuth = (): GoogleAuth => {
  const [response, setResponse] = useState<AuthSessionResult | null>(null);
  const promptAsync = useCallback(async (): Promise<AuthSessionResult> => {
    let result: AuthSessionResult;
    try {
      const signIn = await nativeGoogleSignIn(GOOGLE_WEB_CLIENT_ID ?? '');
      result =
        signIn.type === 'success'
          ? { type: 'success', errorCode: null, error: null, params: { id_token: signIn.idToken }, authentication: null, url: '' }
          : { type: 'dismiss' };
    } catch (error: any) {
      console.error('Native Google sign in error:', error);
      result = { type: 'error', errorCode: String(error?.code ?? 'unknown'), error, params: {}, authentication: null, url: '' };
    }
    setResponse(result);
    return result;
  }, []);
  return { request: NATIVE_REQUEST, response, promptAsync, available: true };
};

const useUnavailableGoogleAuth = (): GoogleAuth => ({
  request: null,
  response: null,
  promptAsync: async () => ({ type: 'dismiss' }),
  available: false,
});

/**
 * Sign in with Google. The implementation is chosen once per build (platform and client id
 * are fixed at build time), so the hook order never changes.
 */
export const useGoogleAuth: () => GoogleAuth = !isGoogleAuthConfigured
  ? useUnavailableGoogleAuth
  : Platform.OS === 'android'
    ? useNativeGoogleAuth
    : useBrowserGoogleAuth;

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
    await nativeGoogleSignOut();
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
  await nativeGoogleSignOut();
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
