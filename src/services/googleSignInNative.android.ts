import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

/**
 * Native Google sign-in on Android (Google Play services account picker).
 *
 * The browser flow of expo-auth-session cannot work on Android: Google rejects custom URI
 * scheme redirects for Android OAuth clients ("Error 400: invalid_request"). The native SDK
 * returns an ID token for the *web* client id, which Firebase accepts; Google checks the app
 * against the Android OAuth clients (package name + SHA-1 of the upload and Play signing keys).
 */
export const hasNativeGoogleSignIn = true;

export type NativeGoogleSignInResult = { type: 'success'; idToken: string } | { type: 'cancel' };

let configuredFor: string | null = null;

export const nativeGoogleSignIn = async (webClientId: string): Promise<NativeGoogleSignInResult> => {
  if (configuredFor !== webClientId) {
    GoogleSignin.configure({ webClientId });
    configuredFor = webClientId;
  }
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return { type: 'cancel' };
    if (!response.data.idToken) throw new Error('Google did not return an ID token');
    return { type: 'success', idToken: response.data.idToken };
  } catch (error) {
    if (isErrorWithCode(error) && (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS)) {
      return { type: 'cancel' };
    }
    throw error;
  }
};

/** Forget the chosen Google account so the next sign-in shows the account picker again. */
export const nativeGoogleSignOut = async (): Promise<void> => {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.warn('Google sign out failed:', error);
  }
};
