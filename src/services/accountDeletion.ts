import { deleteCloudAccountData } from './sync';
import {
  deleteCurrentUser,
  getAccountKind,
  getCurrentUser,
  hasRecentSignIn,
  reauthenticateWithPassword,
  signOut,
} from './auth';

/**
 * Where account deletion stopped:
 * - `password`: the password was wrong (nothing was changed);
 * - `reauth`: the user must sign in again first (Google/other accounts after ~5 minutes);
 * - `cloud`: cloud data could not be deleted (offline?) — local data is kept and still
 *   pending, the user stays signed in and can retry;
 * - `account`: cloud data is gone but the Firebase account could not be deleted — the
 *   user is signed out; retrying after signing in again finishes the job.
 */
export type AccountDeletionStage = 'password' | 'reauth' | 'cloud' | 'account';

export class AccountDeletionError extends Error {
  constructor(public stage: AccountDeletionStage, public cause?: unknown) {
    super(`Account deletion failed at ${stage}`);
    this.name = 'AccountDeletionError';
  }
}

const WRONG_PASSWORD_CODES = new Set(['auth/wrong-password', 'auth/invalid-credential', 'auth/invalid-login-credentials']);

/**
 * Delete the signed-in account and everything it stored in the cloud (App Store 5.1.1(v),
 * Google Play account-deletion policy). Data on this device is kept and keeps working
 * offline. Email accounts confirm with their password first, so a stale session can never
 * leave the cloud wiped but the account still in place.
 */
export const deleteAccount = async ({ password }: { password?: string } = {}): Promise<void> => {
  const user = getCurrentUser();
  if (!user) throw new AccountDeletionError('reauth');
  const kind = getAccountKind();

  if (kind === 'password') {
    try {
      await reauthenticateWithPassword(password ?? '');
    } catch (error: any) {
      throw new AccountDeletionError(WRONG_PASSWORD_CODES.has(error?.code) ? 'password' : 'reauth', error);
    }
  } else if (kind !== 'anonymous' && !hasRecentSignIn()) {
    throw new AccountDeletionError('reauth');
  }

  try {
    await deleteCloudAccountData(user.uid);
  } catch (error) {
    throw new AccountDeletionError('cloud', error);
  }

  try {
    await deleteCurrentUser();
  } catch (error) {
    // The cloud data is already gone and the local records are detached, so signing out
    // is safe. An anonymous account holds no personal data and cannot sign in again;
    // anything else must sign in and retry to remove the account itself.
    await signOut().catch(() => undefined);
    if (kind !== 'anonymous') throw new AccountDeletionError('account', error);
  }
};
