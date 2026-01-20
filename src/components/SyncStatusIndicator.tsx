import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, useColorScheme } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useSync } from '../hooks/useSync';
import { Colors } from '../constants/colors';

export const SyncStatusIndicator: React.FC = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const { user } = useAuth();
  const { syncStatus, pendingCount } = useSync();

  if (!user) {
    return null; // Not signed in, no sync indicator
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {syncStatus === 'syncing' && (
        <>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.text, { color: colors.text }]}>Syncing...</Text>
        </>
      )}

      {syncStatus === 'synced' && (
        <>
          <Text style={styles.checkmark}>✓</Text>
          <Text style={[styles.text, { color: colors.text }]}>Synced</Text>
        </>
      )}

      {syncStatus === 'error' && (
        <>
          <Text style={styles.warning}>⚠</Text>
          <Text style={[styles.text, { color: '#f44336' }]}>Sync error</Text>
        </>
      )}

      {pendingCount > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text style={styles.badgeText}>{pendingCount}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 14,
    color: '#4CAF50',
  },
  warning: {
    fontSize: 14,
    color: '#f44336',
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
