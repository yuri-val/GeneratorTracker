import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import {
  Card,
  Button,
  Text,
  List,
  Divider,
  Badge,
  Avatar,
  Surface,
  SegmentedButtons,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTabBarOverlap } from '../../navigation/useTabBarOverlap';
import { ScreenHeader } from '../../components/ScreenHeader';
import { isIOS } from '../../theme/platform';
import Constants from 'expo-constants';
import { useAuth } from '../../hooks/useAuth';
import { useSync } from '../../hooks/useSync';
import { EmailAuthForm, useEmailAuth } from '../../components/EmailAuthForm';
import { NativeForm, type FormSection } from '../../components/form/NativeForm';
import { DeleteAccountDialog } from '../../components/DeleteAccountDialog';
import { deleteAccount, AccountDeletionError } from '../../services/accountDeletion';
import { useAppTheme } from '../../theme/useAppTheme';
import { saveLanguage } from '../../utils/storage';
import { isUsingFirebaseEmulator } from '../../config/firebase';
import { appColors } from '../../theme';
import {
  signInWithEmail,
  signUpWithEmail,
  signInAnonymouslyUser,
  signInWithGoogleCredential,
  useGoogleAuth,
  getAccountKind,
} from '../../services/auth';
import { contentColumn } from '../../theme/layout';

// Read once from the app config so the About section never lags behind app.json.
const APP_VERSION = Constants.expoConfig?.version ?? '';

export default function SettingsScreen() {
  const theme = useAppTheme();
  const tabBarOverlap = useTabBarOverlap();
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const { syncStatus, pendingCount, performInitialSync, performManualSync } = useSync();

  const [signingIn, setSigningIn] = useState(false);
  const { request, response, promptAsync, available: googleAvailable } = useGoogleAuth();

  const handleLanguageChange = async (newLang: string) => {
    await i18n.changeLanguage(newLang);
    await saveLanguage(newLang);
  };

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const idToken = id_token || response.authentication?.idToken;
      if (idToken) {
        handleGoogleSignIn(idToken);
      } else {
        console.error('No ID token found in OAuth response:', response.params);
        Alert.alert(t('common.error'), t('auth.failedToGetToken'));
      }
    } else if (response?.type === 'error') {
      console.error('OAuth error:', response.error);
      Alert.alert(t('common.error'), response.error?.message || t('auth.authFailed'));
    }
  }, [response]);

  const handleGoogleSignIn = async (idToken: string) => {
    try {
      setSigningIn(true);
      const signedIn = await signInWithGoogleCredential(idToken);
      await performInitialSync(signedIn.uid);
      Alert.alert(t('common.success'), t('settings.signedInSuccess'));
    } catch (error: any) {
      console.error('Google sign in error:', error);
      Alert.alert(t('common.error'), error.message || t('auth.failedToSignInWithGoogle'));
    } finally {
      setSigningIn(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    try {
      setSigningIn(true);
      const signedIn = await signInAnonymouslyUser();
      await performInitialSync(signedIn.uid);
      Alert.alert(t('common.success'), t('settings.signedInAnonymously'));
    } catch (error: any) {
      console.error('Anonymous sign in error:', error);
      Alert.alert(t('common.error'), error.message || t('auth.failedToSignInAnonymously'));
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      Alert.alert(t('common.success'), t('settings.signedOutSuccess'));
    } catch (error: any) {
      console.error('Sign out error:', error);
      Alert.alert(t('common.error'), error.message || t('auth.failedToSignOut'));
    }
  };

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>();
  const [deleting, setDeleting] = useState(false);

  const deletionMessage = (error: unknown): string => {
    const stage = error instanceof AccountDeletionError ? error.stage : 'cloud';
    return {
      password: t('settings.deleteAccountWrongPassword'),
      reauth: t('settings.deleteAccountReauth'),
      cloud: t('settings.deleteAccountCloudFailed'),
      account: t('settings.deleteAccountAccountFailed'),
    }[stage];
  };

  const runAccountDeletion = async (password?: string) => {
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await deleteAccount({ password });
      setDeleteDialogVisible(false);
      Alert.alert(t('common.success'), t('settings.accountDeleted'));
    } catch (error) {
      console.error('Account deletion error:', error);
      const message = deletionMessage(error);
      if (error instanceof AccountDeletionError && error.stage === 'password') {
        setDeleteError(message); // keep the dialog open to retry
      } else {
        setDeleteDialogVisible(false);
      }
      Alert.alert(t('common.error'), message);
    } finally {
      setDeleting(false);
    }
  };

  /** iOS: system alert, then a secure-text prompt for email accounts; elsewhere a Material dialog. */
  const handleDeleteAccount = () => {
    const needsPassword = getAccountKind() === 'password';
    if (!isIOS) {
      setDeleteError(undefined);
      setDeleteDialogVisible(true);
      return;
    }
    Alert.alert(t('settings.deleteAccountTitle'), t('settings.deleteAccountMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.deleteAccountConfirm'),
        style: 'destructive',
        onPress: () => {
          if (!needsPassword) {
            runAccountDeletion();
            return;
          }
          Alert.prompt(
            t('settings.deleteAccountPasswordTitle'),
            t('settings.deleteAccountPasswordMessage', { email: user?.email ?? '' }),
            [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('settings.deleteAccountConfirm'), style: 'destructive', onPress: (value?: string) => runAccountDeletion(value ?? '') },
            ],
            'secure-text'
          );
        },
      },
    ]);
  };

  const handleManualSync = async () => {
    try {
      await performManualSync();
      Alert.alert(t('common.success'), t('settings.syncCompleted'));
    } catch (error: any) {
      console.error('Manual sync error:', error);
      Alert.alert(t('common.error'), error.message || t('settings.syncFailed'));
    }
  };

  const handleEmailSignIn = async (email: string, password: string) => {
    try {
      const signedIn = await signInWithEmail(email, password);
      await performInitialSync(signedIn.uid);
      Alert.alert(t('common.success'), t('settings.signedInSuccess'));
    } catch (error: any) {
      console.error('Email sign in error:', error);
      Alert.alert(t('common.error'), error.message || t('auth.failedToSignIn'));
      throw error;
    }
  };

  const handleEmailSignUp = async (email: string, password: string) => {
    try {
      const signedIn = await signUpWithEmail(email, password);
      await performInitialSync(signedIn.uid);
      Alert.alert(t('common.success'), t('settings.accountCreatedSuccess'));
    } catch (error: any) {
      console.error('Email sign up error:', error);
      Alert.alert(t('common.error'), error.message || t('auth.failedToCreateAccount'));
      throw error;
    }
  };

  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'syncing': return 'cloud-sync';
      case 'synced': return 'cloud-check';
      case 'error': return 'cloud-alert';
      default: return 'cloud-outline';
    }
  };

  const getSyncColor = () => {
    switch (syncStatus) {
      case 'syncing': return theme.colors.primary;
      case 'synced': return theme.colors.tertiary;
      case 'error': return theme.colors.error;
      default: return theme.colors.onSurfaceVariant;
    }
  };

  const getSyncText = () => {
    switch (syncStatus) {
      case 'syncing': return t('settings.syncing');
      case 'synced': return t('settings.synced');
      case 'error': return t('settings.syncError');
      default: return t('settings.idle');
    }
  };

  if (isIOS) {
    return (
      <SettingsIOS
        user={user}
        syncText={getSyncText()}
        syncTone={syncStatus === 'error' ? 'error' : syncStatus === 'synced' ? 'accent' : 'muted'}
        syncing={syncStatus === 'syncing'}
        pendingCount={pendingCount}
        signingIn={signingIn}
        onAnonymousSignIn={handleAnonymousSignIn}
        onEmailSignIn={handleEmailSignIn}
        onEmailSignUp={handleEmailSignUp}
        onSignOut={handleSignOut}
        onDeleteAccount={handleDeleteAccount}
        deleting={deleting}
        onSync={handleManualSync}
        language={i18n.language.split('-')[0]}
        onLanguageChange={handleLanguageChange}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title={t('settings.title')} largeTitle />

      <ScrollView
        contentContainerStyle={[styles.content, contentColumn, { paddingBottom: tabBarOverlap + 16 }]}
      >
        <Animated.View entering={FadeInDown.delay(0).springify()}>
          <List.Section>
            <List.Subheader style={styles.sectionTitle}>{t('settings.account')}</List.Subheader>

            {!user ? (
              <Surface elevation={1} style={styles.sectionCard}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                  {t('settings.syncDescription')}
                </Text>

                <EmailAuthForm
                  onSignIn={handleEmailSignIn}
                  onSignUp={handleEmailSignUp}
                />

                {Platform.OS !== 'android' && (
                  <>
                    <View style={styles.divider}>
                      <Divider style={styles.dividerLine} />
                      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, paddingHorizontal: 12 }}>
                        {t('common.or')}
                      </Text>
                      <Divider style={styles.dividerLine} />
                    </View>

                    {googleAvailable && (
                      <Button
                        mode="elevated"
                        icon="google"
                        onPress={() => promptAsync()}
                        disabled={!request || signingIn}
                        loading={signingIn}
                        style={styles.authButton}
                        contentStyle={styles.authButtonContent}
                      >
                        {t('settings.signInWithGoogle')}
                      </Button>
                    )}

                    <Button
                      mode="outlined"
                      icon="incognito"
                      onPress={handleAnonymousSignIn}
                      disabled={signingIn}
                      style={styles.authButton}
                      contentStyle={styles.authButtonContent}
                    >
                      {t('settings.signInAnonymously')}
                    </Button>
                  </>
                )}
              </Surface>
            ) : (
              <Surface elevation={1} style={styles.sectionCard}>
                <Card mode="contained" style={{ backgroundColor: 'transparent' }}>
                  <Card.Title
                    title={user.email || t('settings.anonymousUser')}
                    subtitle={user.displayName || undefined}
                    titleVariant="titleMedium"
                    left={(props) => (
                      <Avatar.Text
                        {...props}
                        label={(user.email?.[0] || 'A').toUpperCase()}
                        style={{ backgroundColor: theme.colors.primary }}
                        color={theme.colors.onPrimary}
                      />
                    )}
                  />
                </Card>

                <Button
                  mode="contained"
                  buttonColor={theme.colors.error}
                  textColor={theme.colors.onError}
                  icon="logout"
                  onPress={handleSignOut}
                  style={styles.authButton}
                  contentStyle={styles.authButtonContent}
                  testID="sign-out"
                >
                  {t('settings.signOut')}
                </Button>
                <Button
                  mode="text"
                  textColor={theme.colors.error}
                  icon="account-remove"
                  onPress={handleDeleteAccount}
                  disabled={deleting}
                  style={styles.authButton}
                  testID="delete-account"
                >
                  {t('settings.deleteAccount')}
                </Button>
              </Surface>
            )}
          </List.Section>
        </Animated.View>

        {user && (
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <List.Section>
              <List.Subheader style={styles.sectionTitle}>{t('settings.sync')}</List.Subheader>
              <Surface elevation={1} style={styles.sectionCard}>
                <List.Item
                  title={t('settings.status')}
                  description={getSyncText()}
                  left={(props) => (
                    <List.Icon {...props} icon={getSyncIcon()} color={getSyncColor()} />
                  )}
                />
                {pendingCount > 0 && (
                  <List.Item
                    title={t('settings.pendingChanges')}
                    description={t('settings.itemsWaitingSync', { count: pendingCount })}
                    left={(props) => <List.Icon {...props} icon="cloud-upload" />}
                    right={() => (
                      <Badge style={{ backgroundColor: theme.colors.primary, alignSelf: 'center' }}>
                        {pendingCount}
                      </Badge>
                    )}
                  />
                )}
                <Button
                  mode="contained"
                  icon="sync"
                  onPress={handleManualSync}
                  loading={syncStatus === 'syncing'}
                  disabled={syncStatus === 'syncing'}
                  style={{ marginTop: 8 }}
                  contentStyle={styles.authButtonContent}
                  testID="sync-now"
                >
                  {t('settings.syncNow')}
                </Button>
              </Surface>
            </List.Section>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <List.Section>
            <List.Subheader style={styles.sectionTitle}>{t('settings.language')}</List.Subheader>
            <Surface elevation={1} style={styles.sectionCard}>
              <SegmentedButtons
                value={i18n.language.split('-')[0]}
                onValueChange={handleLanguageChange}
                buttons={[
                  { value: 'en', label: t('settings.english'), testID: 'lang-en' },
                  { value: 'uk', label: t('settings.ukrainian'), testID: 'lang-uk' },
                ]}
              />
            </Surface>
          </List.Section>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <List.Section>
            <List.Subheader style={styles.sectionTitle}>{t('settings.about')}</List.Subheader>
            <Surface elevation={1} style={styles.sectionCard}>
              <List.Item
                title={t('home.title')}
                description={t('settings.version', { version: APP_VERSION })}
                left={(props) => <List.Icon {...props} icon="information" />}
              />
              {isUsingFirebaseEmulator && (
                <List.Item
                  title={t('settings.emulatorTitle')}
                  description={t('settings.emulatorDescription')}
                  left={(props) => <List.Icon {...props} icon="test-tube" color={appColors.warning} />}
                />
              )}
            </Surface>
          </List.Section>
        </Animated.View>
      </ScrollView>
      <DeleteAccountDialog
        visible={deleteDialogVisible}
        email={user?.email}
        needsPassword={!!user && getAccountKind() === 'password'}
        busy={deleting}
        error={deleteError}
        onDismiss={() => setDeleteDialogVisible(false)}
        onConfirm={runAccountDeletion}
      />
    </View>
  );
}

interface SettingsIOSProps {
  user: ReturnType<typeof useAuth>['user'];
  syncText: string;
  syncTone: 'accent' | 'muted' | 'error';
  syncing: boolean;
  pendingCount: number;
  signingIn: boolean;
  onAnonymousSignIn: () => void;
  onEmailSignIn: (email: string, password: string) => Promise<void>;
  onEmailSignUp: (email: string, password: string) => Promise<void>;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  deleting: boolean;
  onSync: () => void;
  language: string;
  onLanguageChange: (language: string) => void;
}

/** iOS: Settings as a native grouped form (SwiftUI Form) under the large-title bar. */
function SettingsIOS(props: SettingsIOSProps) {
  const { t } = useTranslation();
  const { user } = props;
  const emailAuth = useEmailAuth({ onSignIn: props.onEmailSignIn, onSignUp: props.onEmailSignUp });
  const busy = emailAuth.loading || props.signingIn;

  const sections: FormSection[] = user
    ? [
        {
          key: 'account',
          title: t('settings.account'),
          fields: [
            { kind: 'info', key: 'user', label: user.email || t('settings.anonymousUser'), value: user.displayName || '' },
            {
              kind: 'button',
              key: 'signOut',
              label: t('settings.signOut'),
              destructive: true,
              systemImage: 'rectangle.portrait.and.arrow.right',
              onPress: props.onSignOut,
              testID: 'sign-out',
            },
          ],
        },
        {
          key: 'deleteAccount',
          footer: t('settings.deleteAccountMessage'),
          fields: [
            {
              kind: 'button',
              key: 'deleteAccount',
              label: t('settings.deleteAccount'),
              destructive: true,
              systemImage: 'trash',
              disabled: props.deleting,
              onPress: props.onDeleteAccount,
              testID: 'delete-account',
            },
          ],
        },
        {
          key: 'sync',
          title: t('settings.sync'),
          fields: [
            { kind: 'info', key: 'status', label: t('settings.status'), value: props.syncText, tone: props.syncTone },
            ...(props.pendingCount > 0
              ? [
                  {
                    kind: 'info' as const,
                    key: 'pending',
                    label: t('settings.pendingChanges'),
                    value: String(props.pendingCount),
                  },
                ]
              : []),
            {
              kind: 'button',
              key: 'syncNow',
              label: t('settings.syncNow'),
              systemImage: 'arrow.clockwise',
              disabled: props.syncing,
              onPress: props.onSync,
              testID: 'sync-now',
            },
          ],
        },
      ]
    : [
        {
          key: 'account',
          title: emailAuth.isSignUp ? t('auth.createAccount') : t('auth.signInEmail'),
          footer: t('settings.syncDescription'),
          fields: [
            {
              kind: 'text',
              key: 'email',
              label: t('auth.email'),
              value: emailAuth.email,
              onChange: emailAuth.setEmail,
              placeholder: 'name@example.com',
              keyboard: 'email',
              testID: 'input-email',
            },
            {
              kind: 'text',
              key: 'password',
              label: t('auth.password'),
              value: emailAuth.password,
              onChange: emailAuth.setPassword,
              placeholder: t('form.required'),
              secure: true,
              testID: 'input-password',
            },
            {
              kind: 'button',
              key: 'submit',
              label: emailAuth.isSignUp ? t('auth.createAccount') : t('auth.signIn'),
              disabled: busy,
              onPress: emailAuth.submit,
              testID: 'auth-submit',
            },
            {
              kind: 'button',
              key: 'toggle',
              label: emailAuth.isSignUp ? t('auth.alreadyHaveAccount') : t('auth.dontHaveAccount'),
              disabled: busy,
              onPress: emailAuth.toggleMode,
              testID: 'auth-toggle-mode',
            },
          ],
        },
        {
          key: 'otherSignIn',
          fields: [
            {
              kind: 'button',
              key: 'anonymous',
              label: t('settings.signInAnonymously'),
              disabled: busy,
              onPress: props.onAnonymousSignIn,
            },
          ],
        },
      ];

  sections.push(
    {
      key: 'language',
      fields: [
        {
          kind: 'picker',
          key: 'language',
          label: t('settings.language'),
          value: props.language,
          options: [
            { value: 'en', label: t('settings.english') },
            { value: 'uk', label: t('settings.ukrainian') },
          ],
          onChange: props.onLanguageChange,
        },
      ],
    },
    {
      key: 'about',
      title: t('settings.about'),
      footer: isUsingFirebaseEmulator ? t('settings.emulatorDescription') : undefined,
      fields: [{ kind: 'info', key: 'version', label: t('home.title'), value: APP_VERSION }],
    }
  );

  return (
    <>
      <ScreenHeader title={t('settings.title')} largeTitle scrollEdge />
      <NativeForm sections={sections} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: '700',
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
  },
  authButton: {
    marginTop: 8,
  },
  authButtonContent: {
    paddingVertical: 4,
  },
});
