import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Card, FAB, Text, Avatar, Chip, Divider } from 'react-native-paper';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { Generator, GeneratorStats, MaintenanceSummary } from '../../models/types';
import { getGenerators, getWorkSessions, getRefills, getMaintenanceTasks } from '../../utils/storage';
import { calculateGeneratorStats, formatDate, getGeneratorMaintenanceSummary } from '../../utils/calculations';
import { SyncStatusIndicator } from '../../components/SyncStatusIndicator';
import { StatBlock } from '../../components/StatBlock';
import { ScreenHeader } from '../../components/ScreenHeader';
import { AppIcon } from '../../components/AppIcon';
import { ICONS } from '../../constants/icons';
import { useAppTheme } from '../../theme/useAppTheme';
import { appColors } from '../../theme';
import { isIOS, surfaces, textColors } from '../../theme/platform';
import { useTabBarOverlap } from '../../navigation/useTabBarOverlap';

type GeneratorWithStats = Generator & { stats: GeneratorStats; maintenance: MaintenanceSummary };

// Android/web: the FAB floats FAB_MARGIN above the tab bar and the list leaves room
// for it. iOS has no FAB — the add action lives in the navigation bar.
const FAB_MARGIN = 16;
const FAB_CLEARANCE = FAB_MARGIN + 56 + 16;

export default function HomeScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t, i18n } = useTranslation();
  const [generators, setGenerators] = useState<GeneratorWithStats[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const tabBarOverlap = useTabBarOverlap();
  const surface = surfaces(theme);
  const text = textColors(theme);

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

  const addGenerator = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('AddGenerator', {});
  };

  const renderGenerator = ({ item, index }: { item: GeneratorWithStats; index: number }) => {
    const maintenanceColor = item.maintenance.level === 'due' ? theme.colors.error : appColors.warning;
    return (
      <Animated.View entering={FadeInUp.delay(index * 80).springify()}>
        <Card
          mode={isIOS ? 'contained' : 'elevated'}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('GeneratorDetail', { generatorId: item.id });
          }}
          style={[styles.card, isIOS && [styles.cardIOS, { backgroundColor: surface.card }]]}
        >
          <Card.Title
            title={item.name}
            subtitle={item.model || undefined}
            titleVariant="titleLarge"
            titleStyle={isIOS ? { color: text.primary as string } : undefined}
            subtitleStyle={isIOS ? { color: text.secondary as string } : undefined}
            left={props =>
              isIOS ? (
                <View style={[styles.iosAvatar, { backgroundColor: theme.colors.primary }]}>
                  <AppIcon name="engine" size={20} color={theme.colors.onPrimary} />
                </View>
              ) : (
                <Avatar.Icon
                  {...props}
                  icon={ICONS.engine.mci}
                  style={{ backgroundColor: theme.colors.primary }}
                  color={theme.colors.onPrimary}
                />
              )
            }
          />
          <Card.Content>
            <View style={styles.statsRow}>
              <StatBlock
                value={`${item.stats.totalHours.toFixed(1)}${t('common.hoursAbbr')}`}
                label={t('home.totalHours')}
                icon="clock"
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
                  icon={() => <AppIcon name="wrench" size={14} color={maintenanceColor} />}
                  compact
                  textStyle={{ fontSize: 12, color: maintenanceColor }}
                  style={{ backgroundColor: maintenanceColor + '22' }}
                >
                  {item.maintenance.dueCount > 0
                    ? t('maintenance.badgeDue', { count: item.maintenance.dueCount })
                    : t('maintenance.badgeSoon', { count: item.maintenance.soonCount })}
                </Chip>
              )}
              {item.stats.lastWorkSessionDate && (
                <Chip
                  icon={() => <AppIcon name="clock" size={14} color={theme.colors.primary} />}
                  compact
                  textStyle={{ fontSize: 12 }}
                >
                  {t('common.last')}: {formatDate(item.stats.lastWorkSessionDate, i18n.language)}
                </Chip>
              )}
            </Card.Actions>
          )}
        </Card>
      </Animated.View>
    );
  };

  const list = (
    <FlatList
      data={generators}
      renderItem={renderGenerator}
      keyExtractor={item => item.id}
      contentInsetAdjustmentBehavior="automatic"
      style={isIOS ? { backgroundColor: surface.screen } : undefined}
      contentContainerStyle={[styles.listContent, !isIOS && { paddingBottom: tabBarOverlap + FAB_CLEARANCE }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <AppIcon name="engineOff" size={80} color={text.secondary} />
          <Text variant="titleMedium" style={[styles.emptyText, { color: text.secondary as string }]}>
            {t('home.noGenerators')}
          </Text>
          <Text variant="bodyMedium" style={{ color: text.secondary as string, textAlign: 'center' }}>
            {t(isIOS ? 'home.addFirstGeneratorIOS' : 'home.addFirstGenerator')}
          </Text>
        </View>
      }
    />
  );

  const header = (
    <ScreenHeader
      title={t('home.title')}
      largeTitle
      trailing={<SyncStatusIndicator />}
      actions={
        isIOS
          ? [
              {
                key: 'add',
                label: t('generator.addTitle'),
                icon: 'add',
                variant: 'prominent',
                onPress: addGenerator,
                testID: 'fab-add-generator',
              },
            ]
          : []
      }
    />
  );

  if (isIOS) {
    // The list is the screen's root so the native large title collapses on scroll.
    return (
      <>
        {header}
        {list}
      </>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {header}
      {list}
      <Animated.View entering={ZoomIn.delay(300)} style={[styles.fabContainer, { bottom: tabBarOverlap + FAB_MARGIN }]}>
        <FAB
          icon={ICONS.add.mci}
          testID="fab-add-generator"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color={theme.colors.onPrimary}
          onPress={addGenerator}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  cardIOS: {
    borderRadius: 16,
  },
  iosAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  fab: {
    borderRadius: 16,
  },
});
