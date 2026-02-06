import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { Appbar, Surface, Text, SegmentedButtons, Icon } from 'react-native-paper';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();

  const [generators, setGenerators] = useState<GeneratorWithStats[]>([]);
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
  const [refillsList, setRefillsList] = useState<Refill[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedView, setSelectedView] = useState('overview');

  const loadAnalytics = async () => {
    try {
      const gens = await getGenerators();
      const sessions = await getWorkSessions();
      const refills = await getRefills();

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

  const totalGenerators = generators.length;
  const totalHours = useMemo(
    () => Math.round(workSessions.reduce((sum, s) => sum + s.hours, 0) * 10) / 10,
    [workSessions]
  );
  const totalFuel = useMemo(
    () => Math.round(refillsList.reduce((sum, r) => sum + r.amount, 0) * 10) / 10,
    [refillsList]
  );
  const avgHours = totalGenerators > 0 ? Math.round((totalHours / totalGenerators) * 10) / 10 : 0;

  const hoursChartData = useMemo(
    () => getHoursOverTime(workSessions, theme.colors.primary, i18n.language),
    [workSessions, i18n.language]
  );
  const fuelChartData = useMemo(
    () => getFuelOverTime(refillsList, theme.colors.primary, i18n.language),
    [refillsList, i18n.language]
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
          <Surface elevation={2} style={styles.statCard}>
            <Icon source="engine" size={24} color={theme.colors.primary} />
            <Text variant="headlineMedium" style={[styles.statValue, { color: theme.colors.primary }]}>
              {totalGenerators}
            </Text>
            <Text variant="labelSmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              {t('analytics.generators')}
            </Text>
          </Surface>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(80).springify()} style={styles.statHalf}>
          <Surface elevation={2} style={styles.statCard}>
            <Icon source="clock-outline" size={24} color={theme.colors.secondary} />
            <Text variant="headlineMedium" style={[styles.statValue, { color: theme.colors.secondary }]}>
              {totalHours.toFixed(1)}
            </Text>
            <Text variant="labelSmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              {t('analytics.totalHours')}
            </Text>
          </Surface>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(160).springify()} style={styles.statHalf}>
          <Surface elevation={2} style={styles.statCard}>
            <Icon source="fuel" size={24} color={theme.colors.primary} />
            <Text variant="headlineMedium" style={[styles.statValue, { color: theme.colors.primary }]}>
              {totalFuel.toFixed(1)}
            </Text>
            <Text variant="labelSmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              {t('analytics.litersUsed')}
            </Text>
          </Surface>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(240).springify()} style={styles.statHalf}>
          <Surface elevation={2} style={styles.statCard}>
            <Icon source="chart-line" size={24} color={theme.colors.secondary} />
            <Text variant="headlineMedium" style={[styles.statValue, { color: theme.colors.secondary }]}>
              {avgHours.toFixed(1)}
            </Text>
            <Text variant="labelSmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              {t('analytics.avgHoursPerGen')}
            </Text>
          </Surface>
        </Animated.View>
      </View>

      {totalGenerators === 0 && (
        <View style={styles.emptyContainer}>
          <Icon source="chart-box-outline" size={64} color={theme.colors.onSurfaceVariant} />
          <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
            {t('analytics.noDataAvailable')}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
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
          <Surface elevation={1} style={styles.chartCard}>
            <Text variant="titleMedium" style={styles.chartTitle}>{t('analytics.operatingHours')}</Text>
            <BarChart
              data={hoursChartData}
              barWidth={24}
              barBorderRadius={6}
              frontColor={theme.colors.primary}
              noOfSections={4}
              yAxisColor="transparent"
              xAxisColor={theme.colors.outline}
              yAxisTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}
              xAxisLabelTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}
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
          <Surface elevation={1} style={styles.chartCard}>
            <Text variant="titleMedium" style={styles.chartTitle}>{t('analytics.fuelConsumption')}</Text>
            <BarChart
              data={fuelChartData}
              barWidth={24}
              barBorderRadius={6}
              frontColor={theme.colors.secondary}
              noOfSections={4}
              yAxisColor="transparent"
              xAxisColor={theme.colors.outline}
              yAxisTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}
              xAxisLabelTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}
              hideRules
              isAnimated
              animationDuration={600}
              height={160}
              width={chartWidth}
            />
          </Surface>
        </Animated.View>
      )}

      {comparisonData.length > 1 && (
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <Surface elevation={1} style={styles.chartCard}>
            <Text variant="titleMedium" style={styles.chartTitle}>{t('analytics.generatorComparison')}</Text>
            <BarChart
              data={comparisonData}
              barWidth={20}
              barBorderRadius={4}
              frontColor={theme.colors.primary}
              noOfSections={4}
              yAxisColor="transparent"
              xAxisColor={theme.colors.outline}
              yAxisTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}
              xAxisLabelTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 9 }}
              hideRules
              isAnimated
              animationDuration={600}
              height={160}
              width={chartWidth}
            />
          </Surface>
        </Animated.View>
      )}

      {pieData.length > 1 && (
        <Animated.View entering={FadeInUp.delay(300).springify()}>
          <Surface elevation={1} style={styles.chartCard}>
            <Text variant="titleMedium" style={styles.chartTitle}>{t('analytics.fuelDistribution')}</Text>
            <View style={styles.pieContainer}>
              <PieChart
                data={pieData}
                donut
                radius={80}
                innerRadius={50}
                innerCircleColor={theme.colors.elevation.level1}
                centerLabelComponent={() => (
                  <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {totalFuel.toFixed(0)}{t('common.liters')}
                  </Text>
                )}
              />
              <View style={styles.pieLegend}>
                {pieData.map((item, i) => (
                  <View key={i} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
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
          <Icon source="chart-line-variant" size={64} color={theme.colors.onSurfaceVariant} />
          <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
            {t('analytics.notEnoughData')}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            {t('analytics.logMoreHint')}
          </Text>
        </View>
      )}
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Content title={t('analytics.title')} titleStyle={styles.headerTitle} />
      </Appbar.Header>

      <SegmentedButtons
        value={selectedView}
        onValueChange={setSelectedView}
        buttons={[
          { value: 'overview', label: t('analytics.overview'), icon: 'view-grid' },
          { value: 'charts', label: t('analytics.charts'), icon: 'chart-line' },
        ]}
        style={styles.segmentedButtons}
      />

      <ScrollView
        contentContainerStyle={styles.content}
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
  segmentedButtons: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
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
