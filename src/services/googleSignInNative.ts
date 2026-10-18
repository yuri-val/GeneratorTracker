// Native Google sign-in exists on Android only (googleSignInNative.android.ts). iOS does not offer
// Google sign-in (App Store guideline 4.8) and web uses expo-auth-session's browser flow.
export const hasNativeGoogleSignIn = false;

export type NativeGoogleSignInResult = { type: 'success'; idToken: string } | { type: 'cancel' };

export const nativeGoogleSignIn = async (_webClientId: string): Promise<NativeGoogleSignInResult> => {
  throw new Error('Native Google sign-in is only available on Android');
};

export const nativeGoogleSignOut = async (): Promise<void> => {};
