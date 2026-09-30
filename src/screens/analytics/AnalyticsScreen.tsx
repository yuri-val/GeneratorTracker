import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { Chip, Surface, Text } from 'react-native-paper';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTabBarOverlap } from '../../navigation/useTabBarOverlap';
import { ScreenHeader } from '../../components/ScreenHeader';
import { PlatformSegmented } from '../../components/PlatformSegmented';
import { AppIcon } from '../../components/AppIcon';
import { isIOS, surfaces, textColors } from '../../theme/platform';
import { Generator, WorkSession, Refill, GeneratorStats } from '../../models/types';
import { getGenerators, getWorkSessions, getRefills } from '../../utils/storage';
import { calculateGeneratorStats } from '../../utils/calculations';
import { useAppTheme } from '../../theme/useAppTheme';
import {
  getHoursOverTime,
  getFuelOverTime,
  getGeneratorComparison,
  getFuelDistribution,
} from '../../utils/analytics';

type GeneratorWithStats = Generator & { stats: GeneratorStats };

const screenWidth = Dimensions.get('window').width;

export default function AnalyticsScreen() {
  const theme = useAppTheme();
  const tabBarOverlap = useTabBarOverlap();
  const surface = surfaces(theme);
  const text = textColors(theme);
  const { t, i18n } = useTranslation();

  const [generators, setGenerators] = useState<GeneratorWithStats[]>([]);
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
  const [refillsList, setRefillsList] = useState<Refill[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedView, setSelectedView] = useState('overview');
  const [selectedGeneratorId, setSelectedGeneratorId] = useState<string | null>(null);

  const loadAnalytics = async () => {
    try {
      const gens = await getGenerators();
      // Only count records of generators that exist: stray records of a deleted
      // generator must never inflate the totals.
      const generatorIds = new Set(gens.map(g => g.id));
      const sessions = (await getWorkSessions()).filter(s => generatorIds.has(s.generatorId));
      const refills = (await getRefills()).filter(r => generatorIds.has(r.generatorId));

      const gensWithStats: GeneratorWithStats[] = gens.map(g => {
        const genSessions = sessions.filter(s => s.generatorId === g.id);
        const genRefills = refills.filter(r => r.generatorId === g.id);
        return { ...g, stats: calculateGeneratorStats(genSessions, genRefills) };
      });

      setGenerators(gensWithStats);
      setWorkSessions(sessions);
      setRefillsList(refills);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadAnalytics();
    }, [])
  );

  const filteredSessions = useMemo(
    () => selectedGeneratorId
      ? workSessions.filter(s => s.generatorId === selectedGeneratorId)
      : workSessions,
    [workSessions, selectedGeneratorId]
  );
  const filteredRefills = useMemo(
    () => selectedGeneratorId
      ? refillsList.filter(r => r.generatorId === selectedGeneratorId)
      : refillsList,
    [refillsList, selectedGeneratorId]
  );
  const filteredGenerators = useMemo(
    () => selectedGeneratorId
      ? generators.filter(g => g.id === selectedGeneratorId)
      : generators,
    [generators, selectedGeneratorId]
  );

  const totalGenerators = filteredGenerators.length;
  const totalHours = useMemo(
    () => Math.round(filteredSessions.reduce((sum, s) => sum + s.hours, 0) * 10) / 10,
    [filteredSessions]
  );
  const totalFuel = useMemo(
    () => Math.round(filteredRefills.reduce((sum, r) => sum + r.amount, 0) * 10) / 10,
    [filteredRefills]
  );
  const avgHours = totalGenerators > 0 ? Math.round((totalHours / totalGenerators) * 10) / 10 : 0;

  const hoursChartData = useMemo(
    () => getHoursOverTime(filteredSessions, theme.colors.primary, i18n.language),
    [filteredSessions, i18n.language]
  );
  const fuelChartData = useMemo(
    () => getFuelOverTime(filteredRefills, theme.colors.primary, i18n.language),
    [filteredRefills, i18n.language]
  );
  const comparisonData = useMemo(
    () => getGeneratorComparison(generators, theme.colors.primary),
    [generators]
  );
  const pieData = useMemo(
    () => getFuelDistribution(generators, refillsList, t('common.litersAbbr')),
    [generators, refillsList, t]
  );

  const chartWidth = screenWidth - 96;

  const renderOverview = () => (
    <>
      <View style={styles.statsGrid}>
        <Animated.View entering={FadeInUp.delay(0).springify()} style={styles.statHalf}>
          <Surface elevation={isIOS ? 0 : 2} style={[styles.statCard, isIOS && { backgroundColor: surface.card }]}>
            <AppIcon name="engine" size={24} color={theme.colors.primary} />
            <Text variant="headlineMedium" style={[styles.statValue, { color: theme.colors.primary }]}>
              {totalGenerators}
            </Text>
            <Text variant="labelSmall" style={[styles.statLabel, { color: text.secondary as string }]}>
              {t('analytics.generators')}
            </Text>
          </Surface>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(80).springify()} style={styles.statHalf}>
          <Surface elevation={isIOS ? 0 : 2} style={[styles.statCard, isIOS && { backgroundColor: surface.card }]}>
            <AppIcon name="clock" size={24} color={theme.colors.secondary} />
            <Text variant="headlineMedium" style={[styles.statValue, { color: theme.colors.secondary }]}>
              {totalHours.toFixed(1)}
            </Text>
            <Text variant="labelSmall" style={[styles.statLabel, { color: text.secondary as string }]}>
              {t('analytics.totalHours')}
            </Text>
          </Surface>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(160).springify()} style={styles.statHalf}>
          <Surface elevation={isIOS ? 0 : 2} style={[styles.statCard, isIOS && { backgroundColor: surface.card }]}>
            <AppIcon name="fuel" size={24} color={theme.colors.primary} />
            <Text variant="headlineMedium" style={[styles.statValue, { color: theme.colors.primary }]}>
              {totalFuel.toFixed(1)}
            </Text>
            <Text variant="labelSmall" style={[styles.statLabel, { color: text.secondary as string }]}>
              {t('analytics.litersUsed')}
            </Text>
          </Surface>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(240).springify()} style={styles.statHalf}>
          <Surface elevation={isIOS ? 0 : 2} style={[styles.statCard, isIOS && { backgroundColor: surface.card }]}>
            <AppIcon name="chartLine" size={24} color={theme.colors.secondary} />
            <Text variant="headlineMedium" style={[styles.statValue, { color: theme.colors.secondary }]}>
              {avgHours.toFixed(1)}
            </Text>
            <Text variant="labelSmall" style={[styles.statLabel, { color: text.secondary as string }]}>
              {t('analytics.avgHoursPerGen')}
            </Text>
          </Surface>
        </Animated.View>
      </View>

      {totalGenerators === 0 && (
        <View style={styles.emptyContainer}>
          <AppIcon name="chartEmpty" size={64} color={text.secondary} />
          <Text variant="titleMedium" style={{ color: text.secondary as string, marginTop: 16 }}>
            {t('analytics.noDataAvailable')}
          </Text>
          <Text variant="bodyMedium" style={{ color: text.secondary as string, textAlign: 'center' }}>
            {t('analytics.addGeneratorsHint')}
          </Text>
        </View>
      )}
    </>
  );

  const renderCharts = () => (
    <>
      {hoursChartData.length > 0 && (
        <Animated.View entering={FadeInUp.delay(0).springify()}>
          <Surface elevation={isIOS ? 0 : 1} style={[styles.chartCard, isIOS && { backgroundColor: surface.card }]}>
            <Text variant="titleMedium" style={styles.chartTitle}>{t('analytics.operatingHours')}</Text>
            <BarChart
              data={hoursChartData}
              barWidth={24}
              barBorderRadius={6}
              frontColor={theme.colors.primary}
              noOfSections={4}
              yAxisColor="transparent"
              xAxisColor={theme.colors.outline}
              yAxisTextStyle={{ color: text.secondary as string, fontSize: 11 }}
              xAxisLabelTextStyle={{ color: text.secondary as string, fontSize: 10 }}
              hideRules
              isAnimated
              animationDuration={600}
              height={160}
              width={chartWidth}
            />
          </Surface>
        </Animated.View>
      )}

      {fuelChartData.length > 0 && (
        <Animated.View entering={FadeInUp.delay(100).springify()}>
          <Surface elevation={isIOS ? 0 : 1} style={[styles.chartCard, isIOS && { backgroundColor: surface.card }]}>
            <Text variant="titleMedium" style={styles.chartTitle}>{t('analytics.fuelConsumption')}</Text>
            <BarChart
              data={fuelChartData}
              barWidth={24}
              barBorderRadius={6}
              frontColor={theme.colors.secondary}
              noOfSections={4}
              yAxisColor="transparent"
              xAxisColor={theme.colors.outline}
              yAxisTextStyle={{ color: text.secondary as string, fontSize: 11 }}
              xAxisLabelTextStyle={{ color: text.secondary as string, fontSize: 10 }}
              hideRules
              isAnimated
              animationDuration={600}
              height={160}
              width={chartWidth}
            />
          </Surface>
        </Animated.View>
      )}

      {!selectedGeneratorId && comparisonData.length > 1 && (
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <Surface elevation={isIOS ? 0 : 1} style={[styles.chartCard, isIOS && { backgroundColor: surface.card }]}>
            <Text variant="titleMedium" style={styles.chartTitle}>{t('analytics.generatorComparison')}</Text>
            <BarChart
              data={comparisonData}
              barWidth={20}
              barBorderRadius={4}
              frontColor={theme.colors.primary}
              noOfSections={4}
              yAxisColor="transparent"
              xAxisColor={theme.colors.outline}
              yAxisTextStyle={{ color: text.secondary as string, fontSize: 11 }}
              xAxisLabelTextStyle={{ color: text.secondary as string, fontSize: 9 }}
              hideRules
              isAnimated
              animationDuration={600}
              height={160}
              width={chartWidth}
            />
          </Surface>
        </Animated.View>
      )}

      {!selectedGeneratorId && pieData.length > 1 && (
        <Animated.View entering={FadeInUp.delay(300).springify()}>
          <Surface elevation={isIOS ? 0 : 1} style={[styles.chartCard, isIOS && { backgroundColor: surface.card }]}>
            <Text variant="titleMedium" style={styles.chartTitle}>{t('analytics.fuelDistribution')}</Text>
            <View style={styles.pieContainer}>
              <PieChart
                data={pieData}
                donut
                radius={80}
                innerRadius={50}
                innerCircleColor={theme.colors.elevation.level1}
                centerLabelComponent={() => (
                  <Text variant="labelMedium" style={{ color: text.secondary as string }}>
                    {totalFuel.toFixed(0)}{t('common.liters')}
                  </Text>
                )}
              />
              <View style={styles.pieLegend}>
                {pieData.map((item, i) => (
                  <View key={i} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text variant="bodySmall" style={{ color: text.secondary as string, flex: 1 }}>
                      {item.label}
                    </Text>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurface }}>
                      {item.text}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </Surface>
        </Animated.View>
      )}

      {hoursChartData.length === 0 && fuelChartData.length === 0 && (
        <View style={styles.emptyContainer}>
          <AppIcon name="chartNoData" size={64} color={text.secondary} />
          <Text variant="titleMedium" style={{ color: text.secondary as string, marginTop: 16 }}>
            {t('analytics.notEnoughData')}
          </Text>
          <Text variant="bodyMedium" style={{ color: text.secondary as string, textAlign: 'center' }}>
            {t('analytics.logMoreHint')}
          </Text>
        </View>
      )}
    </>
  );

  const viewSwitcher = (
    <PlatformSegmented
      value={selectedView}
      onValueChange={setSelectedView}
      options={[
        { value: 'overview', label: t('analytics.overview'), icon: 'grid' },
        { value: 'charts', label: t('analytics.charts'), icon: 'chartLine' },
      ]}
      style={isIOS ? styles.segmentedIOS : styles.segmentedButtons}
    />
  );

  const header = (
    <ScreenHeader
      title={t('analytics.title')}
      largeTitle
      menu={
        isIOS && generators.length > 1
          ? {
              label: t('analytics.allGenerators'),
              icon: 'filter',
              actions: [
                {
                  key: 'all',
                  label: t('analytics.allGenerators'),
                  selected: selectedGeneratorId === null,
                  onPress: () => setSelectedGeneratorId(null),
                },
                ...generators.map(g => ({
                  key: g.id,
                  label: g.name,
                  selected: selectedGeneratorId === g.id,
                  onPress: () => setSelectedGeneratorId(g.id),
                })),
              ],
            }
          : undefined
      }
    />
  );

  if (isIOS) {
    // Native: the scroll view is the screen root (collapsing large title); the
    // generator filter is a pull-down menu in the navigation bar.
    return (
      <>
        {header}
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={{ backgroundColor: surface.screen }}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          }
        >
          {viewSwitcher}
          {selectedView === 'overview' ? renderOverview() : renderCharts()}
        </ScrollView>
      </>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {header}
      {viewSwitcher}

      {generators.length > 1 && (
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterBar}
          >
            <Chip
              selected={selectedGeneratorId === null}
              onPress={() => setSelectedGeneratorId(null)}
              showSelectedOverlay
            >
              {t('analytics.allGenerators')}
            </Chip>
            {generators.map(g => (
              <Chip
                key={g.id}
                selected={selectedGeneratorId === g.id}
                onPress={() => setSelectedGeneratorId(g.id)}
                showSelectedOverlay
              >
                {g.name}
              </Chip>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarOverlap + 16 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        {selectedView === 'overview' ? renderOverview() : renderCharts()}
      </ScrollView>
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
  segmentedIOS: {
    marginBottom: 16,
  },
  segmentedButtons: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  filterContainer: {
    paddingBottom: 8,
  },
  filterBar: {
    paddingHorizontal: 16,
    gap: 8,
  },
  content: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statHalf: {
    width: '47%',
  },
  statCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontWeight: '700',
  },
  statLabel: {
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  chartCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  chartTitle: {
    marginBottom: 16,
    fontWeight: '600',
  },
  pieContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  pieLegend: {
    flex: 1,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 8,
  },
});
