import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import {
  Appbar,
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
import { useAuth } from '../../hooks/useAuth';
import { useSync } from '../../hooks/useSync';
import { EmailAuthForm } from '../../components/EmailAuthForm';
import { useAppTheme } from '../../theme/useAppTheme';
import { saveLanguage } from '../../utils/storage';
import {
  signInWithEmail,
  signUpWithEmail,
  signInAnonymouslyUser,
  signInWithGoogleCredential,
  useGoogleAuth,
} from '../../services/auth';

export default function SettingsScreen() {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const { syncStatus, pendingCount, performInitialSync, performManualSync } = useSync();

  const [signingIn, setSigningIn] = useState(false);
  const { request, response, promptAsync } = useGoogleAuth();

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
      await signInWithGoogleCredential(idToken);
      await performInitialSync();
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
      await signInAnonymouslyUser();
      await performInitialSync();
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
      await signInWithEmail(email, password);
      await performInitialSync();
      Alert.alert(t('common.success'), t('settings.signedInSuccess'));
    } catch (error: any) {
      console.error('Email sign in error:', error);
      Alert.alert(t('common.error'), error.message || t('auth.failedToSignIn'));
      throw error;
    }
  };

  const handleEmailSignUp = async (email: string, password: string) => {
    try {
      await signUpWithEmail(email, password);
      await performInitialSync();
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Content title={t('settings.title')} titleStyle={styles.headerTitle} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
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
                >
                  {t('settings.signOut')}
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
                  { value: 'en', label: t('settings.english') },
                  { value: 'uk', label: t('settings.ukrainian') },
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
                title="Generator Tracker"
                description={t('settings.version', { version: '2.2.0' })}
                left={(props) => <List.Icon {...props} icon="information" />}
              />
            </Surface>
          </List.Section>
        </Animated.View>
      </ScrollView>
    </View>
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
    paddingBottom: 100,
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
