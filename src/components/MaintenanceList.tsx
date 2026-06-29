import React from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Card, Text, Button, Icon, Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { MaintenanceTask, MaintenanceStatusLevel } from '../models/types';
import { calculateMaintenanceStatus } from '../utils/calculations';
import { useAppTheme } from '../theme/useAppTheme';
import { appColors } from '../theme';

interface MaintenanceListProps {
  tasks: MaintenanceTask[];
  currentEngineHours: number;
  onTaskPress: (taskId: string) => void;
  onAddPress: () => void;
  onMarkServiced: (task: MaintenanceTask) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export const MaintenanceList: React.FC<MaintenanceListProps> = ({
  tasks,
  currentEngineHours,
  onTaskPress,
  onAddPress,
  onMarkServiced,
  onRefresh,
  refreshing,
}) => {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const statusColor = (level: MaintenanceStatusLevel): string => {
    if (level === 'due') return theme.colors.error;
    if (level === 'soon') return appColors.warning;
    return appColors.success;
  };

  const statusIcon = (level: MaintenanceStatusLevel): string => {
    if (level === 'due') return 'alert-circle';
    if (level === 'soon') return 'clock-alert-outline';
    return 'check-circle-outline';
  };

  const statusLabel = (level: MaintenanceStatusLevel): string => {
    if (level === 'due') return t('maintenance.statusDue');
    if (level === 'soon') return t('maintenance.statusSoon');
    return t('maintenance.statusOk');
  };

  const renderItem = ({ item }: { item: MaintenanceTask }) => {
    const status = calculateMaintenanceStatus(item, currentEngineHours);
    const color = statusColor(status.level);

    const intervalParts: string[] = [];
    if (item.intervalHours) intervalParts.push(t('maintenance.everyHours', { hours: item.intervalHours }));
    if (item.intervalDays) intervalParts.push(t('maintenance.everyDays', { days: item.intervalDays }));

    const remainingParts: string[] = [];
    if (status.hoursRemaining !== undefined) {
      remainingParts.push(
        status.hoursRemaining >= 0
          ? t('maintenance.hoursLeft', { hours: Math.round(status.hoursRemaining * 10) / 10 })
          : t('maintenance.hoursOverdue', { hours: Math.round(Math.abs(status.hoursRemaining) * 10) / 10 })
      );
    }
    if (status.daysRemaining !== undefined) {
      remainingParts.push(
        status.daysRemaining >= 0
          ? t('maintenance.daysLeft', { days: status.daysRemaining })
          : t('maintenance.daysOverdue', { days: Math.abs(status.daysRemaining) })
      );
    }

    return (
      <Card mode="outlined" onPress={() => onTaskPress(item.id)} style={[styles.card, { borderColor: color }]}>
        <Card.Title
          title={item.title}
          subtitle={intervalParts.join('  ·  ') || undefined}
          titleVariant="titleMedium"
          left={(props) => <Icon {...props} source="wrench" size={24} color={color} />}
          right={() => (
            <Chip
              compact
              icon={statusIcon(status.level)}
              style={[styles.statusChip, { backgroundColor: color + '22' }]}
              textStyle={{ color, fontSize: 12 }}
            >
              {statusLabel(status.level)}
            </Chip>
          )}
        />
        <Card.Content style={styles.cardContent}>
          {remainingParts.length > 0 && (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {remainingParts.join('  ·  ')}
            </Text>
          )}
          {item.notes ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              {item.notes}
            </Text>
          ) : null}
        </Card.Content>
        <Card.Actions>
          <Button
            mode="contained-tonal"
            icon="check"
            compact
            onPress={() => onMarkServiced(item)}
          >
            {t('maintenance.markServiced')}
          </Button>
        </Card.Actions>
      </Card>
    );
  };

  return (
    <FlatList
      data={tasks}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      style={{ backgroundColor: theme.colors.background }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
      }
      ListHeaderComponent={
        <Button
          mode="contained-tonal"
          icon="plus"
          onPress={onAddPress}
          style={styles.addButton}
          contentStyle={styles.addButtonContent}
        >
          {t('maintenance.addButton')}
        </Button>
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Icon source="wrench-outline" size={48} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
            {t('maintenance.emptyState')}
          </Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: 8,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  cardContent: {
    paddingTop: 0,
  },
  statusChip: {
    marginRight: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  addButton: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  addButtonContent: {
    paddingVertical: 4,
  },
});
