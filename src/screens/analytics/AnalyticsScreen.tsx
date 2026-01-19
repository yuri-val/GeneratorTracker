import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getGenerators, getWorkSessions, getRefills } from '../../utils/storage';
import { calculateGeneratorStats } from '../../utils/calculations';
import { Colors } from '../../constants/colors';

export default function AnalyticsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [totalGenerators, setTotalGenerators] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [totalFuel, setTotalFuel] = useState(0);
  const [averageHoursPerGenerator, setAverageHoursPerGenerator] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalytics = async () => {
    try {
      const generators = await getGenerators();
      const workSessions = await getWorkSessions();
      const refills = await getRefills();

      const totalHrs = workSessions.reduce((sum, s) => sum + s.hours, 0);
      const totalFuelAmount = refills.reduce((sum, r) => sum + r.amount, 0);
      const avgHours = generators.length > 0 ? totalHrs / generators.length : 0;

      setTotalGenerators(generators.length);
      setTotalHours(Math.round(totalHrs * 10) / 10);
      setTotalFuel(Math.round(totalFuelAmount * 10) / 10);
      setAverageHoursPerGenerator(Math.round(avgHours * 10) / 10);
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

  const StatCard = ({ title, value, unit }: { title: string; value: number | string; unit?: string }) => (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statTitle, { color: colors.textMuted }]}>{title}</Text>
      <View style={styles.statValueContainer}>
        <Text style={[styles.statValue, { color: colors.primary }]}>{value}</Text>
        {unit && <Text style={[styles.statUnit, { color: colors.textMuted }]}>{unit}</Text>}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Analytics</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Overview</Text>

        <StatCard title="Total Generators" value={totalGenerators} />
        <StatCard title="Total Operating Hours" value={totalHours} unit="hours" />
        <StatCard title="Total Fuel Used" value={totalFuel} unit="liters" />
        <StatCard title="Average Hours per Generator" value={averageHoursPerGenerator} unit="hours" />

        {totalGenerators === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No data available yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              Add generators and log work sessions to see analytics
            </Text>
          </View>
        )}
      </ScrollView>
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  statUnit: {
    fontSize: 16,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});
