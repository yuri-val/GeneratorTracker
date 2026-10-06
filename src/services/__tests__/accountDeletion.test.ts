/**
 * Account deletion must never leave the cloud wiped while the account (or local data)
 * is in an inconsistent state: identity is confirmed first, the cloud is deleted next,
 * the Firebase account last.
 */
jest.mock('../sync', () => ({ deleteCloudAccountData: jest.fn() }));
jest.mock('../auth', () => ({
  getCurrentUser: jest.fn(),
  getAccountKind: jest.fn(),
  hasRecentSignIn: jest.fn(),
  reauthenticateWithPassword: jest.fn(),
  deleteCurrentUser: jest.fn(),
  signOut: jest.fn(),
}));

import * as sync from '../sync';
import * as auth from '../auth';
import { deleteAccount, AccountDeletionError } from '../accountDeletion';

const mSync = sync as jest.Mocked<typeof sync>;
const mAuth = auth as jest.Mocked<typeof auth>;

const order: string[] = [];

beforeEach(() => {
  jest.clearAllMocks();
  order.length = 0;
  mAuth.getCurrentUser.mockReturnValue({ uid: 'u1' } as never);
  mAuth.getAccountKind.mockReturnValue('password');
  mAuth.hasRecentSignIn.mockReturnValue(false);
  mAuth.reauthenticateWithPassword.mockImplementation(async () => void order.push('reauth'));
  mSync.deleteCloudAccountData.mockImplementation(async () => (order.push('cloud'), 3));
  mAuth.deleteCurrentUser.mockImplementation(async () => void order.push('account'));
  mAuth.signOut.mockImplementation(async () => void order.push('signOut'));
});

const stageOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return 'ok';
  } catch (error) {
    return error instanceof AccountDeletionError ? error.stage : String(error);
  }
};

it('email account: confirms the password, deletes the cloud data, then the account', async () => {
  await deleteAccount({ password: 'secret' });

  expect(mAuth.reauthenticateWithPassword).toHaveBeenCalledWith('secret');
  expect(mSync.deleteCloudAccountData).toHaveBeenCalledWith('u1');
  expect(order).toEqual(['reauth', 'cloud', 'account']);
});

it('wrong password: stops before touching any data', async () => {
  mAuth.reauthenticateWithPassword.mockRejectedValue(Object.assign(new Error('bad'), { code: 'auth/invalid-credential' }));

  expect(await stageOf(deleteAccount({ password: 'nope' }))).toBe('password');
  expect(mSync.deleteCloudAccountData).not.toHaveBeenCalled();
  expect(mAuth.deleteCurrentUser).not.toHaveBeenCalled();
});

it('anonymous account: needs no password', async () => {
  mAuth.getAccountKind.mockReturnValue('anonymous');

  await deleteAccount();

  expect(mAuth.reauthenticateWithPassword).not.toHaveBeenCalled();
  expect(order).toEqual(['cloud', 'account']);
});

it('Google account with a stale session: asks to sign in again before deleting anything', async () => {
  mAuth.getAccountKind.mockReturnValue('google');

  expect(await stageOf(deleteAccount())).toBe('reauth');
  expect(mSync.deleteCloudAccountData).not.toHaveBeenCalled();
});

it('Google account right after signing in: deletes', async () => {
  mAuth.getAccountKind.mockReturnValue('google');
  mAuth.hasRecentSignIn.mockReturnValue(true);

  await deleteAccount();
  expect(order).toEqual(['cloud', 'account']);
});

it('cloud deletion fails: keeps the account (user can retry) and does not sign out', async () => {
  mSync.deleteCloudAccountData.mockRejectedValue(new Error('offline'));

  expect(await stageOf(deleteAccount({ password: 'secret' }))).toBe('cloud');
  expect(mAuth.deleteCurrentUser).not.toHaveBeenCalled();
  expect(mAuth.signOut).not.toHaveBeenCalled();
});

it('account deletion fails after the cloud is wiped: signs out and reports it', async () => {
  mAuth.deleteCurrentUser.mockRejectedValue(new Error('requires-recent-login'));

  expect(await stageOf(deleteAccount({ password: 'secret' }))).toBe('account');
  expect(order).toEqual(['reauth', 'cloud', 'signOut']);
});

it('anonymous account that cannot be deleted: signs out silently (no personal data, no way back in)', async () => {
  mAuth.getAccountKind.mockReturnValue('anonymous');
  mAuth.deleteCurrentUser.mockRejectedValue(new Error('requires-recent-login'));

  expect(await stageOf(deleteAccount())).toBe('ok');
  expect(order).toEqual(['cloud', 'signOut']);
});
