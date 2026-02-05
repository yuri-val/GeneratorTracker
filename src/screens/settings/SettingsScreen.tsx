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
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../../hooks/useAuth';
import { useSync } from '../../hooks/useSync';
import { EmailAuthForm } from '../../components/EmailAuthForm';
import { useAppTheme } from '../../theme/useAppTheme';
import {
  signInWithEmail,
  signUpWithEmail,
  signInAnonymouslyUser,
  signInWithGoogleCredential,
  useGoogleAuth,
} from '../../services/auth';

export default function SettingsScreen() {
  const theme = useAppTheme();
  const { user, signOut } = useAuth();
  const { syncStatus, pendingCount, performInitialSync, performManualSync } = useSync();

  const [signingIn, setSigningIn] = useState(false);
  const { request, response, promptAsync } = useGoogleAuth();

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token, authentication } = response.params;
      const idToken = id_token || authentication?.idToken;
      if (idToken) {
        handleGoogleSignIn(idToken);
      } else {
        console.error('No ID token found in OAuth response:', response.params);
        Alert.alert('Error', 'Failed to get authentication token from Google');
      }
    } else if (response?.type === 'error') {
      console.error('OAuth error:', response.error);
      Alert.alert('Error', response.error?.message || 'Authentication failed');
    }
  }, [response]);

  const handleGoogleSignIn = async (idToken: string) => {
    try {
      setSigningIn(true);
      await signInWithGoogleCredential(idToken);
      await performInitialSync();
      Alert.alert('Success', 'Signed in successfully');
    } catch (error: any) {
      console.error('Google sign in error:', error);
      Alert.alert('Error', error.message || 'Failed to sign in with Google');
    } finally {
      setSigningIn(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    try {
      setSigningIn(true);
      await signInAnonymouslyUser();
      await performInitialSync();
      Alert.alert('Success', 'Signed in anonymously');
    } catch (error: any) {
      console.error('Anonymous sign in error:', error);
      Alert.alert('Error', error.message || 'Failed to sign in anonymously');
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      Alert.alert('Success', 'Signed out successfully');
    } catch (error: any) {
      console.error('Sign out error:', error);
      Alert.alert('Error', error.message || 'Failed to sign out');
    }
  };

  const handleManualSync = async () => {
    try {
      await performManualSync();
      Alert.alert('Success', 'Sync completed');
    } catch (error: any) {
      console.error('Manual sync error:', error);
      Alert.alert('Error', error.message || 'Sync failed');
    }
  };

  const handleEmailSignIn = async (email: string, password: string) => {
    try {
      await signInWithEmail(email, password);
      await performInitialSync();
      Alert.alert('Success', 'Signed in successfully');
    } catch (error: any) {
      console.error('Email sign in error:', error);
      Alert.alert('Error', error.message || 'Failed to sign in');
      throw error;
    }
  };

  const handleEmailSignUp = async (email: string, password: string) => {
    try {
      await signUpWithEmail(email, password);
      await performInitialSync();
      Alert.alert('Success', 'Account created successfully');
    } catch (error: any) {
      console.error('Email sign up error:', error);
      Alert.alert('Error', error.message || 'Failed to create account');
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
      case 'syncing': return 'Syncing...';
      case 'synced': return 'Synced';
      case 'error': return 'Error';
      default: return 'Idle';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Content title="Settings" titleStyle={styles.headerTitle} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View entering={FadeInDown.delay(0).springify()}>
          <List.Section>
            <List.Subheader style={styles.sectionTitle}>Account</List.Subheader>

            {!user ? (
              <Surface elevation={1} style={styles.sectionCard}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                  Sign in to sync your data across devices
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
                        OR
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
                      Sign in with Google
                    </Button>

                    <Button
                      mode="outlined"
                      icon="incognito"
                      onPress={handleAnonymousSignIn}
                      disabled={signingIn}
                      style={styles.authButton}
                      contentStyle={styles.authButtonContent}
                    >
                      Sign in Anonymously
                    </Button>
                  </>
                )}
              </Surface>
            ) : (
              <Surface elevation={1} style={styles.sectionCard}>
                <Card mode="contained" style={{ backgroundColor: 'transparent' }}>
                  <Card.Title
                    title={user.email || 'Anonymous User'}
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
                  Sign Out
                </Button>
              </Surface>
            )}
          </List.Section>
        </Animated.View>

        {user && (
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <List.Section>
              <List.Subheader style={styles.sectionTitle}>Sync</List.Subheader>
              <Surface elevation={1} style={styles.sectionCard}>
                <List.Item
                  title="Status"
                  description={getSyncText()}
                  left={(props) => (
                    <List.Icon {...props} icon={getSyncIcon()} color={getSyncColor()} />
                  )}
                />
                {pendingCount > 0 && (
                  <List.Item
                    title="Pending changes"
                    description={`${pendingCount} items waiting to sync`}
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
                  Sync Now
                </Button>
              </Surface>
            </List.Section>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <List.Section>
            <List.Subheader style={styles.sectionTitle}>About</List.Subheader>
            <Surface elevation={1} style={styles.sectionCard}>
              <List.Item
                title="Generator Tracker"
                description="Version 2.0.2"
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
