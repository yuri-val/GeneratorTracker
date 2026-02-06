import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text, Badge } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useSync } from '../hooks/useSync';
import { useAppTheme } from '../theme/useAppTheme';

export const SyncStatusIndicator: React.FC = () => {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { syncStatus, pendingCount } = useSync();

  if (!user) {
    return null;
  }

  const getStatusContent = () => {
    switch (syncStatus) {
      case 'syncing':
        return (
          <>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('settings.syncStatusSyncing')}
            </Text>
          </>
        );
      case 'synced':
        return (
          <>
            <MaterialCommunityIcons name="check-circle" size={16} color={theme.colors.tertiary} />
            <Text variant="labelSmall" style={{ color: theme.colors.tertiary }}>
              {t('settings.syncStatusSynced')}
            </Text>
          </>
        );
      case 'error':
        return (
          <>
            <MaterialCommunityIcons name="alert-circle" size={16} color={theme.colors.error} />
            <Text variant="labelSmall" style={{ color: theme.colors.error }}>
              {t('settings.syncStatusError')}
            </Text>
          </>
        );
      default:
        return null;
    }
  };

  const content = getStatusContent();
  if (!content && pendingCount === 0) return null;

  return (
    <View style={styles.container}>
      {content}
      {pendingCount > 0 && (
        <Badge size={18} style={{ backgroundColor: theme.colors.primary }}>
          {pendingCount}
        </Badge>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 6,
  },
});
