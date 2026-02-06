import React from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Card, Text, Button, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { Refill } from '../models/types';
import { formatDate } from '../utils/calculations';
import { useAppTheme } from '../theme/useAppTheme';

interface RefillsListProps {
  refills: Refill[];
  onRefillPress: (refillId: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
  onAddPress: () => void;
}

export const RefillsList: React.FC<RefillsListProps> = ({
  refills,
  onRefillPress,
  onRefresh,
  refreshing,
  onAddPress,
}) => {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();

  const renderItem = ({ item }: { item: Refill }) => (
    <Card
      mode="outlined"
      onPress={() => onRefillPress(item.id)}
      style={styles.card}
    >
      <Card.Title
        title={formatDate(item.date, i18n.language)}
        subtitle={item.notes || undefined}
        titleVariant="titleSmall"
        left={(props) => <Icon {...props} source="fuel" size={24} color={theme.colors.primary} />}
        right={() => (
          <Text variant="titleLarge" style={[styles.amountValue, { color: theme.colors.primary }]}>
            {item.amount}{t('common.litersAbbr')}
          </Text>
        )}
      />
    </Card>
  );

  return (
    <FlatList
      data={refills}
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
          {t('refill.addButton')}
        </Button>
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Icon source="fuel-off" size={48} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
            {t('refill.emptyState')}
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
  amountValue: {
    fontWeight: '700',
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
