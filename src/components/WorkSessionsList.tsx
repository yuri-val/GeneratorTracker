import React from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Card, Text, Button, Icon } from 'react-native-paper';
import { WorkSession } from '../models/types';
import { formatDate, formatTime } from '../utils/calculations';
import { useAppTheme } from '../theme/useAppTheme';

interface WorkSessionsListProps {
  sessions: WorkSession[];
  onSessionPress: (sessionId: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
  onAddPress: () => void;
}

export const WorkSessionsList: React.FC<WorkSessionsListProps> = ({
  sessions,
  onSessionPress,
  onRefresh,
  refreshing,
  onAddPress,
}) => {
  const theme = useAppTheme();

  const renderItem = ({ item }: { item: WorkSession }) => (
    <Card
      mode="outlined"
      onPress={() => onSessionPress(item.id)}
      style={styles.card}
    >
      <Card.Title
        title={formatDate(item.date)}
        subtitle={`${formatTime(item.startTime)} - ${item.endTime ? formatTime(item.endTime) : 'In Progress'}`}
        titleVariant="titleSmall"
        left={(props) => <Icon {...props} source="clock-outline" size={24} color={theme.colors.secondary} />}
        right={() => (
          <Text variant="titleLarge" style={[styles.hoursValue, { color: theme.colors.primary }]}>
            {item.hours.toFixed(1)}h
          </Text>
        )}
      />
      {item.notes && (
        <Card.Content style={styles.notesContent}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }} numberOfLines={1}>
            {item.notes}
          </Text>
        </Card.Content>
      )}
    </Card>
  );

  return (
    <FlatList
      data={sessions}
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
          Add Work Session
        </Button>
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Icon source="clock-off" size={48} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
            No work sessions yet
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
  hoursValue: {
    fontWeight: '700',
    marginRight: 16,
  },
  notesContent: {
    paddingTop: 0,
    paddingBottom: 12,
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
