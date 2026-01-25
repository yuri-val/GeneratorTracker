import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import { useAuth } from '../../hooks/useAuth';
import { useSync } from '../../hooks/useSync';
import { Colors } from '../../constants/colors';
import { EmailAuthForm } from '../../components/EmailAuthForm';
import {
  signInWithEmail,
  signUpWithEmail,
  signInAnonymouslyUser,
  signInWithGoogleCredential,
  useGoogleAuth,
} from '../../services/auth';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const { user, signOut } = useAuth();
  const { syncStatus, pendingCount, performInitialSync, performManualSync } = useSync();

  const [signingIn, setSigningIn] = useState(false);
  const { request, response, promptAsync } = useGoogleAuth();

  // Handle Google OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token, authentication } = response.params;
      // On web, the token might be in authentication.idToken
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
      // Trigger initial sync after sign-in
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>

        {!user ? (
          <>
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              Sign in to sync your data across devices
            </Text>

            <EmailAuthForm
              colors={colors}
              onSignIn={handleEmailSignIn}
              onSignUp={handleEmailSignUp}
            />

            {Platform.OS !== 'android' && (
              <View style={styles.divider}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.textMuted }]}>OR</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>
            )}

            {Platform.OS !== 'android' && (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={() => promptAsync()}
                disabled={!request || signingIn}
              >
                {signingIn ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Sign in with Google</Text>
                )}
              </TouchableOpacity>
            )}

            {Platform.OS !== 'android' && (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, { borderColor: colors.primary }]}
                onPress={handleAnonymousSignIn}
                disabled={signingIn}
              >
                <Text style={[styles.buttonTextSecondary, { color: colors.primary }]}>
                  Sign in Anonymously
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <View style={[styles.userInfo, { backgroundColor: colors.card }]}>
              <Text style={[styles.userEmail, { color: colors.text }]}>
                {user.email || 'Anonymous User'}
              </Text>
              {user.displayName && (
                <Text style={[styles.userName, { color: colors.textMuted }]}>
                  {user.displayName}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={handleSignOut}
            >
              <Text style={styles.buttonText}>Sign Out</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {user && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Sync</Text>

          <View style={[styles.syncInfo, { backgroundColor: colors.card }]}>
            <View style={styles.syncRow}>
              <Text style={[styles.syncLabel, { color: colors.textMuted }]}>Status:</Text>
              <View style={styles.syncStatusRow}>
                {syncStatus === 'syncing' && (
                  <>
                    <ActivityIndicator size="small" color={colors.primary} style={styles.syncIcon} />
                    <Text style={[styles.syncValue, { color: colors.text }]}>Syncing...</Text>
                  </>
                )}
                {syncStatus === 'synced' && (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={styles.syncIcon} />
                    <Text style={[styles.syncValue, { color: colors.text }]}>Synced</Text>
                  </>
                )}
                {syncStatus === 'error' && (
                  <>
                    <Ionicons name="alert-circle" size={16} color="#f44336" style={styles.syncIcon} />
                    <Text style={[styles.syncValue, { color: colors.text }]}>Error</Text>
                  </>
                )}
                {syncStatus === 'idle' && <Text style={[styles.syncValue, { color: colors.text }]}>Idle</Text>}
              </View>
            </View>

            {pendingCount > 0 && (
              <View style={styles.syncRow}>
                <Text style={[styles.syncLabel, { color: colors.textMuted }]}>
                  Pending:
                </Text>
                <Text style={[styles.syncValue, { color: colors.text }]}>
                  {pendingCount} items
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleManualSync}
            disabled={syncStatus === 'syncing'}
          >
            {syncStatus === 'syncing' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sync Now</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
        <View style={[styles.infoBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
            Generator Tracker
          </Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>Version 1.5.0</Text>
        </View>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  dangerButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
  },
  userInfo: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userName: {
    fontSize: 14,
  },
  syncInfo: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncIcon: {
    marginRight: 6,
    marginBottom: 8,
  },
  syncLabel: {
    fontSize: 14,
  },
  syncValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    padding: 16,
    borderRadius: 8,
  },
  infoLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: '500',
  },
});
