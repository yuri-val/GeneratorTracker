import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useColorScheme,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { Generator, GeneratorStats } from '../../models/types';
import { getGenerators, getWorkSessions, getRefills } from '../../utils/storage';
import { calculateGeneratorStats, formatDate } from '../../utils/calculations';
import { Colors } from '../../constants/colors';
import { SyncStatusIndicator } from '../../components/SyncStatusIndicator';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MainTabs'>;
};

type GeneratorWithStats = Generator & { stats: GeneratorStats };

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const [generators, setGenerators] = useState<GeneratorWithStats[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadGenerators = async () => {
    try {
      const generatorList = await getGenerators();
      const workSessions = await getWorkSessions();
      const refills = await getRefills();

      const generatorsWithStats: GeneratorWithStats[] = generatorList.map(gen => {
        const genSessions = workSessions.filter(s => s.generatorId === gen.id);
        const genRefills = refills.filter(r => r.generatorId === gen.id);
        const stats = calculateGeneratorStats(genSessions, genRefills);

        return { ...gen, stats };
      });

      setGenerators(generatorsWithStats);
    } catch (error) {
      console.error('Error loading generators:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGenerators();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadGenerators();
    }, [])
  );

  const renderGenerator = ({ item }: { item: GeneratorWithStats }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => navigation.navigate('GeneratorDetail', { generatorId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
        {item.model && (
          <Text style={[styles.cardModel, { color: colors.textMuted }]}>{item.model}</Text>
        )}
      </View>

      <View style={styles.cardStats}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {item.stats.totalHours}h
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Hours</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {item.stats.totalRefills}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Refills</Text>
        </View>
      </View>

      {item.stats.lastWorkSessionDate && (
        <View style={styles.cardFooter}>
          <Text style={[styles.lastActivity, { color: colors.textMuted }]}>
            Last used: {formatDate(item.stats.lastWorkSessionDate)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Generator Tracker</Text>
        <SyncStatusIndicator />
      </View>

      <FlatList
        data={generators}
        renderItem={renderGenerator}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No generators yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              Tap the + button to add your first generator
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AddGenerator', {})}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardModel: {
    fontSize: 14,
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  lastActivity: {
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: '#ffffff',
    fontWeight: '300',
  },
});
