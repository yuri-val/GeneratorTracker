import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { WorkSession } from '../models/types';
import { formatDate, formatTime } from '../utils/calculations';
import { Colors } from '../constants/colors';

interface WorkSessionsListProps {
  sessions: WorkSession[];
  colors: typeof Colors.light;
  onSessionPress: (sessionId: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
  onAddPress: () => void;
}

export const WorkSessionsList: React.FC<WorkSessionsListProps> = ({
  sessions,
  colors,
  onSessionPress,
  onRefresh,
  refreshing,
  onAddPress,
}) => {
  const renderItem = ({ item }: { item: WorkSession }) => (
    <TouchableOpacity
      style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => onSessionPress(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.itemContent}>
        <Text style={[styles.itemDate, { color: colors.text }]}>{formatDate(item.date)}</Text>
        <Text style={[styles.itemDetail, { color: colors.textMuted }]}>
          {formatTime(item.startTime)} - {item.endTime ? formatTime(item.endTime) : 'In Progress'}
        </Text>
        {item.notes && (
          <Text style={[styles.itemNotes, { color: colors.textMuted }]} numberOfLines={1}>
            {item.notes}
          </Text>
        )}
      </View>
      <Text style={[styles.itemValue, { color: colors.primary }]}>{item.hours}h</Text>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>
        No work sessions yet
      </Text>
    </View>
  );

  const renderHeader = () => (
    <TouchableOpacity
      style={[styles.addButton, { backgroundColor: colors.primary }]}
      onPress={onAddPress}
    >
      <Text style={styles.addButtonText}>+ Add Work Session</Text>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={sessions}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      style={{ backgroundColor: colors.background }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: 8,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  itemContent: {
    flex: 1,
  },
  itemDate: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 14,
    marginBottom: 2,
  },
  itemNotes: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  itemValue: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  addButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
