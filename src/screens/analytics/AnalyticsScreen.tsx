import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTabBarOverlap } from '../../navigation/useTabBarOverlap';
import type { RootStackParamList } from '../../navigation/types';
import { ScreenHeader } from '../../components/ScreenHeader';
import { AppIcon } from '../../components/AppIcon';
import { AccentRule, FilterChips, GtText, Num, PageHeader, PageSummary, StackedBars, StatusBarScrim } from '../../components/gt';
import { isIOS } from '../../theme/platform';
import type { Generator, Refill, WorkSession } from '../../models/types';
import { getGenerators, getRefills, getWorkSessions } from '../../utils/storage';
import { useAppTheme } from '../../theme/useAppTheme';
import { generatorColor, space } from '../../theme/tokens';
import { contentColumn } from '../../theme/layout';
import { fuelByMonth, hoursByMonth, totalsByGenerator } from '../../utils/analytics';
import { fmtNumber, fmtSummary, hourUnit, litreUnit, NBSP } from '../../utils/format';

const ALL = 'all';

/**
 * Analytics (3.0): totals, monthly run hours and fuel as square bars split by generator colour, and a
 * per-generator list. Same visual language as Home: ink rule, mono digits, generator accent rules.
 */
export default function AnalyticsScreen() {
  const { gt } = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tabBarOverlap = useTabBarOverlap();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [generators, setGenerators] = useState<Generator[]>([]);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [refills, setRefills] = useState<Refill[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>(ALL);

  const load = useCallback(async () => {
    try {
      const gens = [...(await getGenerators())].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
      // Only records of existing generators: strays of a deleted one must never inflate the totals.
      const ids = new Set(gens.map(g => g.id));
      setGenerators(gens);
      setSessions((await getWorkSessions()).filter(s => ids.has(s.generatorId)));
      setRefills((await getRefills()).filter(r => ids.has(r.generatorId)));
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Identity colours follow creation order, exactly like Home.
  const colorOf = useMemo(() => {
    const map = new Map(generators.map((g, i) => [g.id, generatorColor(i)]));
    return (id: string) => map.get(id) ?? gt.textMuted;
  }, [generators, gt.textMuted]);

  const activeFilter = filter !== ALL && generators.some(g => g.id === filter) ? filter : ALL;
  const selected = activeFilter === ALL ? generators : generators.filter(g => g.id === activeFilter);
  const order = selected.map(g => g.id);
  const totals = useMemo(() => totalsByGenerator(selected, sessions, refills), [selected, sessions, refills]);
  const hours = totals.reduce((s, x) => s + x.hours, 0);
  const litres = totals.reduce((s, x) => s + x.litres, 0);
  const lph = hours > 0 ? litres / hours : 0;
  const hoursMonths = useMemo(() => hoursByMonth(sessions, order, lang), [sessions, order.join(), lang]);
  const fuelMonths = useMemo(() => fuelByMonth(refills, order, lang), [refills, order.join(), lang]);
  const hasMonthly = hoursMonths.some(m => m.total > 0) || fuelMonths.some(m => m.total > 0);
  const maxHours = Math.max(0, ...totals.map(x => x.hours));

  const running = sessions.filter(s => s.isActive).length;
  const summary = generators.length > 0 ? fmtSummary(generators.length, running, lang) : t('home.summaryEmpty');

  const filterBar =
    generators.length > 1 ? (
      <FilterChips
        accessibilityLabel={t('analytics.filterLabel')}
        value={activeFilter}
        onChange={setFilter}
        options={[{ key: ALL, label: t('analytics.all') }, ...generators.map(g => ({ key: g.id, label: g.name, color: colorOf(g.id) }))]}
      />
    ) : null;

  const stats = (
    <View style={styles.block}>
      <GtText variant="caption" color={gt.textMuted}>
        {t('analytics.allTime')}
      </GtText>
      <View style={[styles.stats, { borderColor: gt.rule }]}>
        <Stat label={t('detail.motorHours')} value={fmtNumber(hours, lang, hours >= 1000 ? 0 : 1)} testID="analytics-total-hours" />
        <Stat label={t('analytics.fuelTotal')} value={fmtNumber(litres, lang, litres >= 1000 ? 0 : 1)} testID="analytics-total-fuel" />
        <Stat label={t('detail.lph')} value={lph > 0 ? fmtNumber(lph, lang, 2) : '—'} testID="analytics-lph" />
      </View>
    </View>
  );

  const legend =
    selected.length > 1 ? (
      <View style={styles.legend}>
        {selected.map(g => (
          <View key={g.id} style={styles.legendItem}>
            <AccentRule color={colorOf(g.id)} height={12} />
            <GtText variant="caption" color={gt.textMuted} numberOfLines={1}>
              {g.name}
            </GtText>
          </View>
        ))}
      </View>
    ) : null;

  const chart = (title: string, unit: string, months: typeof hoursMonths, testID: string) => (
    <View style={styles.block}>
      <View>
        <GtText variant="cardTitle" accessibilityRole="header">
          {title}
        </GtText>
        <GtText variant="caption" color={gt.textMuted}>
          {t('analytics.last6', { unit })}
        </GtText>
      </View>
      <StackedBars
        months={months}
        colorOf={colorOf}
        lang={lang}
        unit={unit}
        testID={testID}
        monthValueLabel={(month, value) => t('analytics.monthValue', { month, value })}
      />
      {legend}
    </View>
  );

  const byGenerator =
    activeFilter === ALL && generators.length > 0 ? (
      <View style={styles.block}>
        <View>
          <GtText variant="cardTitle" accessibilityRole="header">
            {t('analytics.byGenerator')}
          </GtText>
          {generators.length > 1 && (
            <GtText variant="caption" color={gt.textMuted}>
              {t('analytics.byGeneratorHint')}
            </GtText>
          )}
        </View>
        <View>
          {[...totals]
            .sort((a, b) => b.hours - a.hours)
            .map(row => {
              const g = generators.find(x => x.id === row.generatorId)!;
              return (
                <Pressable
                  key={row.generatorId}
                  onPress={() => navigation.navigate('GeneratorDetail', { generatorId: row.generatorId })}
                  accessibilityRole="button"
                  testID={`analytics-row-${row.generatorId}`}
                  style={({ pressed }) => [styles.genRow, { borderBottomColor: gt.rule }, pressed && { backgroundColor: gt.pressed }]}
                >
                  <View style={styles.rowBetween}>
                    <View style={styles.nameRow}>
                      <AccentRule color={colorOf(row.generatorId)} />
                      <GtText variant="rowTitle" numberOfLines={1} style={styles.flex}>
                        {g.name}
                      </GtText>
                    </View>
                    <GtText variant="rowTitle" mono>
                      {fmtNumber(row.hours, lang)}
                      <GtText variant="caption" color={gt.textMuted}>
                        {NBSP}{hourUnit(lang)}
                      </GtText>
                    </GtText>
                  </View>
                  <GtText variant="caption" color={gt.textMuted} style={styles.indent}>
                    {t('analytics.rowDetail', {
                      litres: fmtNumber(row.litres, lang),
                      lph: row.lph > 0 ? fmtNumber(row.lph, lang, 2) : '—',
                      sessions: row.sessions,
                    })}
                  </GtText>
                  <View style={[styles.share, { backgroundColor: gt.barTrack }]}>
                    <View style={{ width: `${maxHours > 0 ? (row.hours / maxHours) * 100 : 0}%`, height: 4, backgroundColor: colorOf(row.generatorId) }} />
                  </View>
                </Pressable>
              );
            })}
        </View>
      </View>
    ) : null;

  const empty = (icon: 'chartEmpty' | 'chartNoData', title: string, hint: string) => (
    <View style={styles.empty}>
      <AppIcon name={icon} size={56} color={gt.textMuted} />
      <GtText variant="cardTitle" style={styles.center}>
        {title}
      </GtText>
      <GtText variant="body" color={gt.textMuted} style={styles.center}>
        {hint}
      </GtText>
    </View>
  );

  const body = !loaded ? null : generators.length === 0 ? (
    empty('chartEmpty', t('analytics.noDataAvailable'), t('analytics.addGeneratorsHint'))
  ) : (
    <>
      {filterBar}
      {stats}
      {hasMonthly ? (
        <>
          {chart(t('analytics.hoursByMonth'), hourUnit(lang), hoursMonths, 'chart-hours')}
          {chart(t('analytics.fuelByMonth'), litreUnit(lang), fuelMonths, 'chart-fuel')}
        </>
      ) : (
        empty('chartNoData', t('analytics.notEnoughData'), t('analytics.logMoreHint'))
      )}
      {byGenerator}
    </>
  );

  const scroll = (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: gt.bg }}
      contentContainerStyle={[styles.content, contentColumn, { paddingBottom: tabBarOverlap + 32 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={gt.textMuted} />}
    >
      {isIOS ? <PageSummary summary={summary} testID="analytics-summary" /> : <PageHeader title={t('analytics.title')} summary={summary} summaryTestID="analytics-summary" />}
      {body}
    </ScrollView>
  );

  if (isIOS) {
    return (
      <>
        <ScreenHeader title={t('analytics.title')} largeTitle scrollEdge />
        {scroll}
      </>
    );
  }
  return (
    <View style={[styles.flex, { backgroundColor: gt.bg }]}>
      {scroll}
      <StatusBarScrim />
    </View>
  );
}

function Stat({ label, value, testID }: { label: string; value: string; testID?: string }) {
  const { gt } = useAppTheme();
  return (
    <View style={styles.stat}>
      <GtText variant="caption" color={gt.textMuted} numberOfLines={1}>
        {label}
      </GtText>
      <GtText variant="sheetTitle" weight="500" mono testID={testID}>
        <Num weight="500">{value}</Num>
      </GtText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  content: { paddingHorizontal: space.screenX, gap: 26 },
  block: { gap: 12 },
  stats: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 12 },
  stat: { flex: 1, gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  genRow: { paddingVertical: 12, borderBottomWidth: 1, gap: 4 },
  indent: { marginLeft: 11 },
  share: { height: 4, marginTop: 6, marginLeft: 11 },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 10 },
});
