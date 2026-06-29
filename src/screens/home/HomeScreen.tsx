import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Appbar, Card, FAB, Text, Avatar, Chip, Divider, Icon } from 'react-native-paper';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { Generator, GeneratorStats, MaintenanceSummary } from '../../models/types';
import { getGenerators, getWorkSessions, getRefills, getMaintenanceTasks } from '../../utils/storage';
import { calculateGeneratorStats, formatDate, getGeneratorMaintenanceSummary } from '../../utils/calculations';
import { SyncStatusIndicator } from '../../components/SyncStatusIndicator';
import { StatBlock } from '../../components/StatBlock';
import { useAppTheme } from '../../theme/useAppTheme';
import { appColors } from '../../theme';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MainTabs'>;
};

type GeneratorWithStats = Generator & { stats: GeneratorStats; maintenance: MaintenanceSummary };

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const [generators, setGenerators] = useState<GeneratorWithStats[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadGenerators = async () => {
    try {
      const generatorList = await getGenerators();
      const workSessions = await getWorkSessions();
      const refills = await getRefills();
      const maintenanceTasks = await getMaintenanceTasks();

      const generatorsWithStats: GeneratorWithStats[] = generatorList.map(gen => {
        const genSessions = workSessions.filter(s => s.generatorId === gen.id);
        const genRefills = refills.filter(r => r.generatorId === gen.id);
        const stats = calculateGeneratorStats(genSessions, genRefills);
        const genTasks = maintenanceTasks.filter(m => m.generatorId === gen.id);
        const maintenance = getGeneratorMaintenanceSummary(genTasks, stats.totalHours);
        return { ...gen, stats, maintenance };
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

  const renderGenerator = ({ item, index }: { item: GeneratorWithStats; index: number }) => (
    <Animated.View entering={FadeInUp.delay(index * 80).springify()}>
      <Card
        mode="elevated"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate('GeneratorDetail', { generatorId: item.id });
        }}
        style={styles.card}
      >
        <Card.Title
          title={item.name}
          subtitle={item.model || undefined}
          titleVariant="titleLarge"
          left={(props) => (
            <Avatar.Icon
              {...props}
              icon="engine"
              style={{ backgroundColor: theme.colors.primary }}
              color={theme.colors.onPrimary}
            />
          )}
        />
        <Card.Content>
          <View style={styles.statsRow}>
            <StatBlock
              value={`${item.stats.totalHours.toFixed(1)}${t('common.hoursAbbr')}`}
              label={t('home.totalHours')}
              icon="clock-outline"
              color={theme.colors.secondary}
            />
            <Divider style={styles.statDivider} />
            <StatBlock
              value={item.stats.totalRefills.toString()}
              label={t('home.refills')}
              icon="fuel"
              color={theme.colors.primary}
            />
          </View>
        </Card.Content>
        {(item.stats.lastWorkSessionDate || item.maintenance.level !== 'ok') && (
          <Card.Actions>
            {item.maintenance.level !== 'ok' && (
              <Chip
                icon="wrench"
                compact
                textStyle={{ fontSize: 12, color: item.maintenance.level === 'due' ? theme.colors.error : appColors.warning }}
                style={{ backgroundColor: (item.maintenance.level === 'due' ? theme.colors.error : appColors.warning) + '22' }}
              >
                {item.maintenance.dueCount > 0
                  ? t('maintenance.badgeDue', { count: item.maintenance.dueCount })
                  : t('maintenance.badgeSoon', { count: item.maintenance.soonCount })}
              </Chip>
            )}
            {item.stats.lastWorkSessionDate && (
              <Chip icon="clock-outline" compact textStyle={{ fontSize: 12 }}>
                {t('common.last')}: {formatDate(item.stats.lastWorkSessionDate, i18n.language)}
              </Chip>
            )}
          </Card.Actions>
        )}
      </Card>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Content title={t('home.title')} titleStyle={styles.headerTitle} />
        <SyncStatusIndicator />
      </Appbar.Header>

      <FlatList
        data={generators}
        renderItem={renderGenerator}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon source="engine-off-outline" size={80} color={theme.colors.onSurfaceVariant} />
            <Text variant="titleMedium" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              {t('home.noGenerators')}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              {t('home.addFirstGenerator')}
            </Text>
          </View>
        }
      />

      <Animated.View entering={ZoomIn.delay(300)} style={styles.fabContainer}>
        <FAB
          icon="plus"
          testID="fab-add-generator"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color={theme.colors.onPrimary}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.navigate('AddGenerator', {});
          }}
        />
      </Animated.View>
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyText: {
    marginTop: 8,
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 110,
  },
  fab: {
    borderRadius: 16,
  },
});
