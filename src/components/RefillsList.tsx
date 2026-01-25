import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Refill } from '../models/types';
import { formatDate } from '../utils/calculations';
import { Colors } from '../constants/colors';

interface RefillsListProps {
  refills: Refill[];
  colors: typeof Colors.light;
  onRefillPress: (refillId: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
  onAddPress: () => void;
}

export const RefillsList: React.FC<RefillsListProps> = ({
  refills,
  colors,
  onRefillPress,
  onRefresh,
  refreshing,
  onAddPress,
}) => {
  const renderItem = ({ item }: { item: Refill }) => (
    <TouchableOpacity
      style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => onRefillPress(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.itemContent}>
        <Text style={[styles.itemDate, { color: colors.text }]}>{formatDate(item.date)}</Text>
        {item.notes && (
          <Text style={[styles.itemNotes, { color: colors.textMuted }]} numberOfLines={1}>
            {item.notes}
          </Text>
        )}
      </View>
      <Text style={[styles.itemValue, { color: colors.primary }]}>{item.amount}L</Text>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>
        No refills yet
      </Text>
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={onAddPress}
      >
        <Text style={styles.addButtonText}>+ Add Refill</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <FlatList
      data={refills}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      style={{ backgroundColor: colors.background }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
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
    padding: 12,
    borderRadius: 8,
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
  itemNotes: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  itemValue: {
    fontSize: 20,
    fontWeight: 'bold',
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
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
