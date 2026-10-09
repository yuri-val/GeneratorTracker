import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, Alert, FlatList, Pressable, RefreshControl } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../navigation/types';
import type { MaintenanceTask, Refill, WorkSession } from '../../models/types';
import { saveMaintenanceTask, deleteGenerator } from '../../utils/storage';
import { calculateMaintenanceStatus, getCurrentDate, markTaskServiced } from '../../utils/calculations';
import { useAppTheme } from '../../theme/useAppTheme';
import { DeleteConfirmDialog } from '../../components/DeleteConfirmDialog';
import { ScreenHeader } from '../../components/ScreenHeader';
import { AppIcon } from '../../components/AppIcon';
import { AccentRule, GtText, Num, SquareButton, useSnackbarBottomOffset } from '../../components/gt';
import { LiveBar } from '../../components/fleet/LiveBar';
import { contentColumn } from '../../theme/layout';
import { isIOS } from '../../theme/platform';
import { size, space } from '../../theme/tokens';
import { buildFleet, useFleet, type FleetItem } from '../../hooks/useFleet';
import { useNow } from '../../hooks/useNow';
import { useSessionActions } from '../../hooks/useSessionActions';
import { sessionElapsedMs } from '../../services/sessions';
import { statusText, usedFraction } from '../../utils/maintenanceView';
import {
  fmtClock, fmtClockTime, fmtLitresValue, fmtNumber, fmtShortDate, litreUnit, NBSP, splitAround,
} from '../../utils/format';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'GeneratorDetail'>;
  route: RouteProp<RootStackParamList, 'GeneratorDetail'>;
};

type Segment = 'sessions' | 'refills' | 'maintenance';
type Row =
  | { kind: 'session'; item: WorkSession }
  | { kind: 'refill'; item: Refill }
  | { kind: 'task'; item: MaintenanceTask }
  | { kind: 'add' }
  | { kind: 'empty' };

/**
 * Generator screen (3.0): session card with a live clock, fuel estimate and engine hours, then the
 * records in three tabs. A live bar at the bottom shows the other running generators.
 */
export default function GeneratorDetailScreen({ navigation, route }: Props) {
  const theme = useAppTheme();
  const { gt } = theme;
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const insets = useSafeAreaInsets();
  const { generatorId } = route.params;
  const { raw, reload } = useFleet();
  const [segment, setSegment] = useState<Segment>('sessions');
  const [refreshing, setRefreshing] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const anyRunning = !!raw?.s.some(s => s.isActive);
  const ownRunning = !!raw?.s.some(s => s.isActive && s.generatorId === generatorId);
  // The clock ticks every second only while this generator runs; the live bar needs a minute tick.
  const now = useNow(ownRunning ? 1000 : 60_000, anyRunning);
  const { start, stop } = useSessionActions(reload);

  const fleet = useMemo(() => (raw ? buildFleet(raw.g, raw.s, raw.r, raw.t, now) : []), [raw, now]);
  const item = fleet.find(i => i.generator.id === generatorId);
  const others = fleet.filter(i => i.running && i.generator.id !== generatorId);
  useSnackbarBottomOffset(others.length > 0 ? size.liveBar + 12 + 12 : 12);

  useFocusEffect(useCallback(() => setInfoOpen(false), []));

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  if (raw && !item) {
    return (
      <View style={[styles.flex, { backgroundColor: gt.bg }]}>
        <ScreenHeader title={t('common.notFound')} leading="back" onLeadingPress={() => navigation.goBack()} />
        <View style={styles.centered}>
          <GtText variant="body" color={gt.textMuted}>
            {t('detail.generatorNotFound')}
          </GtText>
        </View>
      </View>
    );
  }
  if (!item) return <View style={[styles.flex, { backgroundColor: gt.bg }]} />;

  const { generator, running, fuel } = item;
  const completed = item.sessions
    .filter(s => !s.isActive)
    .sort((a, b) => `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`));
  const refills = [...item.refills].sort((a, b) => `${b.date}T${b.time ?? ''}`.localeCompare(`${a.date}T${a.time ?? ''}`));
  const tasks = [...item.tasks].sort((a, b) => a.title.localeCompare(b.title));
  const elapsedMs = running ? sessionElapsedMs(running, now) : 0;
  const engineHours = item.engineHours + elapsedMs / 3_600_000;

  const openEditor = () => navigation.navigate('AddGenerator', { generatorId });
  const openActiveSession = () => running && navigation.navigate('AddWorkSession', { generatorId, sessionId: running.id });

  const handleMarkServiced = async (task: MaintenanceTask) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await saveMaintenanceTask(markTaskServiced(task, Math.round(item.engineHours * 10) / 10, getCurrentDate()));
      await reload();
    } catch (error) {
      console.error(error);
      Alert.alert(t('common.error'), t('maintenance.saveError'));
    }
  };

  const confirmDelete = async () => {
    setShowDeleteDialog(false);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await deleteGenerator(generatorId);
      navigation.goBack();
    } catch {
      Alert.alert(t('common.error'), t('detail.failedToDeleteGenerator'));
    }
  };

  const add = () =>
    segment === 'sessions'
      ? navigation.navigate('AddWorkSession', { generatorId })
      : segment === 'refills'
      ? navigation.navigate('AddRefill', { generatorId })
      : navigation.navigate('AddMaintenance', { generatorId });

  const records: Row[] =
    segment === 'sessions'
      ? completed.map(s => ({ kind: 'session' as const, item: s }))
      : segment === 'refills'
      ? refills.map(r => ({ kind: 'refill' as const, item: r }))
      : tasks.map(m => ({ kind: 'task' as const, item: m }));
  const rows: Row[] = [{ kind: 'add' }, ...(records.length ? records : [{ kind: 'empty' as const }])];

  const [sinceBefore, sinceAfter] = splitAround(t, 'home.since', 'time');

  const sessionCard = running ? (
    <View
      testID="session-card-running"
      style={[styles.runCard, { backgroundColor: gt.runSurface }, gt.dark && { borderTopWidth: 3, borderTopColor: item.color }]}
    >
      <View style={styles.rowBetween}>
        <GtText variant="meta" weight="500" color={gt.running}>
          ● {t('detail.activeSession')}
        </GtText>
        <GtText variant="meta" weight="500" color={gt.runMuted}>
          {sinceBefore}
          <Num color={gt.runText}>{fmtClockTime(running.startTime, lang)}</Num>
          {sinceAfter}
        </GtText>
      </View>
      <GtText variant="timerDetail" color={gt.runText} testID="session-clock" accessibilityRole="timer">
        {fmtClock(elapsedMs)}
      </GtText>
      {fuel && (
        <View style={styles.columns}>
          <View style={styles.flex}>
            <GtText variant="caption" color={gt.runMuted}>
              {t('detail.used')}
            </GtText>
            <GtText variant="cardTitle" color={gt.runText}>
              ≈{NBSP}<Num>{fmtLitresValue((elapsedMs / 3_600_000) * fuel.lph, lang)}</Num>
              <GtText variant="meta" color={gt.runMuted}>{NBSP}{litreUnit(lang)}</GtText>
            </GtText>
          </View>
          <View style={styles.flex}>
            <Pressable
              onPress={() => setInfoOpen(o => !o)}
              accessibilityRole="button"
              accessibilityLabel={t('detail.infoToggle')}
              accessibilityState={{ expanded: infoOpen }}
              hitSlop={10}
              style={styles.infoRow}
              testID="fuel-info-toggle"
            >
              <GtText variant="caption" color={gt.runMuted}>
                {t('detail.inTank')}
              </GtText>
              <View style={[styles.infoDot, { borderColor: gt.runMuted }]}>
                <GtText variant="caption" size={10} weight="600" color={gt.runMuted}>
                  i
                </GtText>
              </View>
            </Pressable>
            <GtText variant="cardTitle" color={gt.runText}>
              {fuel.known ? (
                <>
                  ≈{NBSP}<Num>{fmtLitresValue(fuel.level, lang)}</Num>
                  <GtText variant="meta" color={gt.runMuted}>
                    {NBSP}{litreUnit(lang)}  ~{fmtNumber(fuel.hoursLeft, lang)}{NBSP}{t('common.hoursAbbr')}
                  </GtText>
                </>
              ) : (
                '—'
              )}
            </GtText>
          </View>
        </View>
      )}
      {fuel && infoOpen && (
        <View style={[styles.infoBox, { backgroundColor: gt.runInfo }]}>
          <GtText variant="caption" color={gt.runInfoText}>
            {fuel.known ? t('detail.fuelEstimateInfo', { lph: fmtNumber(fuel.lph, lang, 2) }) : t('detail.fuelUnknown')}
          </GtText>
        </View>
      )}
      <View style={styles.buttonsGrid}>
        <SquareButton
          kind="stop"
          glyph="stop"
          label={t('detail.stopSession')}
          onPress={() => stop(running, generator.name)}
          testID="stop-session"
          style={styles.flex}
        />
        <SquareButton kind="secondary" onRunning label={t('detail.editSessionTime')} onPress={openActiveSession} testID="edit-active-session" />
      </View>
    </View>
  ) : (
    <View testID="session-card-idle" style={[styles.idleCard, { borderColor: gt.dark ? gt.ruleStrong : gt.text }]}>
      {fuel && (
        <GtText variant="meta" color={gt.textMuted}>
          {fuel.known ? (
            <>
              {t('home.fuelLabel')} ≈{NBSP}
              <Num color={gt.text}>{fmtLitresValue(fuel.level, lang)}</Num>
              {NBSP}{litreUnit(lang)} / <Num>{fmtLitresValue(generator.tankCapacity!, lang)}</Num> · ~{fmtNumber(fuel.hoursLeft, lang)}
              {NBSP}{t('common.hoursAbbr')}
            </>
          ) : (
            t('detail.fuelUnknown')
          )}
        </GtText>
      )}
      <SquareButton
        kind="primary"
        glyph="play"
        label={t('detail.startSession')}
        onPress={() => start(generatorId)}
        testID="start-session"
      />
    </View>
  );

  const stats = (
    <View style={[styles.stats, { borderColor: gt.rule }]}>
      <Stat label={t('detail.motorHours')} value={fmtNumber(engineHours, lang)} testID="stat-engine-hours" />
      <Stat label={t('detail.lph')} value={item.lph > 0 && completed.length ? fmtNumber(item.lph, lang, 2) : '—'} />
      <Stat label={t('detail.tankLitres')} value={generator.tankCapacity ? fmtNumber(generator.tankCapacity, lang) : '—'} />
    </View>
  );

  const tabs = (
    <View style={[styles.tabs, { borderBottomColor: gt.rule }]} accessibilityRole="tablist">
      {(
        [
          ['sessions', t('detail.workSessions'), completed.length],
          ['refills', t('detail.refills'), refills.length],
          ['maintenance', t('maintenance.tabLabel'), tasks.length],
        ] as const
      ).map(([key, label, count]) => {
        const active = segment === key;
        return (
          <Pressable
            key={key}
            onPress={() => setSegment(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${label} (${count})`}
            testID={`detail-tab-${key}`}
            style={[styles.tab, active && { borderBottomColor: gt.text }]}
          >
            <GtText variant="rowTitle" weight={active ? '600' : '500'} color={active ? gt.text : gt.textMuted}>
              {label} <Num weight="500">{count}</Num>
            </GtText>
          </Pressable>
        );
      })}
    </View>
  );

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.titleRow}>
        <AccentRule color={item.color} width={4} height={24} />
        <GtText variant="screenTitle" style={styles.flex} numberOfLines={2} accessibilityRole="header" testID="detail-title">
          {generator.name}
        </GtText>
      </View>
      {!!generator.model && (
        <GtText variant="meta" color={gt.textMuted} style={styles.model}>
          {generator.model}
        </GtText>
      )}
      {sessionCard}
      {stats}
      {tabs}
      {segment === 'maintenance' && tasks.length > 0 && (
        <GtText variant="caption" color={gt.textMuted}>
          {t('detail.maintenanceScaleHint')}
        </GtText>
      )}
    </View>
  );

  const addLabel =
    segment === 'sessions' ? t('workSession.addButton') : segment === 'refills' ? t('refill.addButton') : t('maintenance.addButton');

  const renderRow = ({ item: row }: { item: Row }) => {
    switch (row.kind) {
      case 'add':
        return (
          <Pressable
            onPress={add}
            accessibilityRole="button"
            testID={`detail-add-${segment}`}
            style={({ pressed }) => [styles.addRow, { borderBottomColor: gt.rule }, pressed && { backgroundColor: gt.pressed }]}
          >
            <AppIcon name="add" size={18} color={gt.text} />
            <GtText variant="rowTitle" color={gt.text}>
              {addLabel}
            </GtText>
          </Pressable>
        );
      case 'empty':
        return (
          <GtText variant="meta" color={gt.textMuted} style={styles.empty}>
            {segment === 'sessions' ? t('workSession.emptyState') : segment === 'refills' ? t('refill.emptyState') : t('maintenance.emptyState')}
          </GtText>
        );
      case 'session': {
        const s = row.item;
        return (
          <Pressable
            onPress={() => navigation.navigate('AddWorkSession', { generatorId, sessionId: s.id })}
            accessibilityRole="button"
            style={({ pressed }) => [styles.recordRow, { borderBottomColor: gt.rule }, pressed && { backgroundColor: gt.pressed }]}
          >
            <View style={styles.flex}>
              <GtText variant="rowTitle">{fmtShortDate(s.date, lang)}</GtText>
              <GtText variant="caption" color={gt.textMuted}>
                <Num weight="400">{fmtClockTime(s.startTime, lang)}</Num> – <Num weight="400">{s.endTime ? fmtClockTime(s.endTime, lang) : '…'}</Num>
                {s.notes ? ` · ${s.notes}` : ''}
              </GtText>
            </View>
            <GtText variant="rowTitle" mono>
              {fmtNumber(s.hours, lang)}
              <GtText variant="caption" color={gt.textMuted}>{NBSP}{t('common.hoursAbbr')}</GtText>
            </GtText>
          </Pressable>
        );
      }
      case 'refill': {
        const r = row.item;
        return (
          <Pressable
            onPress={() => navigation.navigate('AddRefill', { generatorId, refillId: r.id })}
            accessibilityRole="button"
            style={({ pressed }) => [styles.recordRow, { borderBottomColor: gt.rule }, pressed && { backgroundColor: gt.pressed }]}
          >
            <View style={styles.flex}>
              <GtText variant="rowTitle">
                {fmtShortDate(r.date, lang)}
                {r.time ? (
                  <GtText variant="caption" color={gt.textMuted}>
                    {'  '}<Num weight="400">{fmtClockTime(r.time, lang)}</Num>
                  </GtText>
                ) : null}
              </GtText>
              {(r.isFull || r.notes) && (
                <GtText variant="caption" color={gt.textMuted} numberOfLines={1}>
                  {[r.isFull ? t('refill.markedFull') : null, r.notes].filter(Boolean).join(' · ')}
                </GtText>
              )}
            </View>
            <GtText variant="rowTitle" mono>
              {fmtLitresValue(r.amount, lang)}
              <GtText variant="caption" color={gt.textMuted}>{NBSP}{litreUnit(lang)}</GtText>
            </GtText>
          </Pressable>
        );
      }
      case 'task': {
        const task = row.item;
        const status = calculateMaintenanceStatus(task, engineHours, new Date(now));
        const color = status.level === 'due' ? gt.due : status.level === 'soon' ? gt.soon : gt.ok;
        const used = usedFraction(task, status);
        return (
          <View style={[styles.taskRow, { borderBottomColor: gt.rule }]}>
            <Pressable
              onPress={() => navigation.navigate('AddMaintenance', { generatorId, taskId: task.id })}
              accessibilityRole="button"
              accessibilityLabel={`${task.title}, ${statusText(task, status, t, lang)}`}
              style={styles.flex}
            >
              <View style={styles.rowBetween}>
                <GtText variant="rowTitle" style={styles.flex} numberOfLines={1}>
                  {task.title}
                </GtText>
                <GtText variant="caption" weight="500" color={color}>
                  {status.level !== 'ok' ? '▲ ' : ''}
                  {statusText(task, status, t, lang)}
                </GtText>
              </View>
              <View style={[styles.bar, { backgroundColor: gt.barTrack }]}>
                <View style={[styles.barFill, { width: `${used * 100}%`, backgroundColor: color }]} />
                <View style={[styles.barTick, { backgroundColor: gt.text }]} />
              </View>
            </Pressable>
            <Pressable
              onPress={() => handleMarkServiced(task)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`${t('maintenance.markServiced')}: ${task.title}`}
              testID={`mark-serviced-${task.id}`}
              style={({ pressed }) => [styles.markButton, pressed && { opacity: 0.5 }]}
            >
              <AppIcon name="markServiced" size={22} color={gt.textMuted} />
            </Pressable>
          </View>
        );
      }
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: gt.bg }]}>
      <ScreenHeader
        title=""
        leading="back"
        onLeadingPress={() => navigation.goBack()}
        // iOS: a "More" pull-down (Edit, destructive Delete) like 2.5; Material: app bar actions.
        menu={{
          label: t('common.more'),
          icon: 'more',
          actions: [
            { key: 'edit', label: t('common.edit'), icon: 'edit', onPress: openEditor },
            { key: 'delete', label: t('common.delete'), icon: 'delete', destructive: true, onPress: () => setShowDeleteDialog(true) },
          ],
        }}
        actions={
          isIOS
            ? []
            : [
                { key: 'edit', label: t('common.edit'), icon: 'edit', onPress: openEditor, testID: 'detail-edit-action' },
                {
                  key: 'delete',
                  label: t('common.delete'),
                  icon: 'delete',
                  destructive: true,
                  onPress: () => setShowDeleteDialog(true),
                  testID: 'detail-delete-generator',
                },
              ]
        }
      />
      <FlatList
        data={rows}
        keyExtractor={(row, index) => ('item' in row ? `${row.kind}-${row.item.id}` : `${row.kind}-${index}`)}
        renderItem={renderRow}
        ListHeaderComponent={header}
        style={styles.flex}
        contentContainerStyle={[styles.content, contentColumn]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={gt.textMuted} />}
      />
      {others.length > 0 && (
        <View style={{ paddingTop: 8, paddingBottom: Math.max(insets.bottom, 12) }}>
          <LiveBar
            others={others}
            now={now}
            onStop={(o: FleetItem) => o.running && stop(o.running, o.generator.name)}
            onHome={() => navigation.popToTop()}
          />
        </View>
      )}
      <DeleteConfirmDialog
        visible={showDeleteDialog}
        title={t('detail.deleteGeneratorTitle')}
        message={t('detail.deleteGeneratorConfirm')}
        onDismiss={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
      />
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
      <GtText variant="cardTitle" mono weight="500" testID={testID}>
        {value}
      </GtText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: space.screenX, paddingTop: 6, paddingBottom: 32 },
  headerBlock: { gap: space.xl, marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  model: { marginTop: -8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  runCard: { paddingVertical: 16, paddingHorizontal: 18, gap: 12 },
  idleCard: { borderWidth: 1.5, padding: 16, gap: 12 },
  columns: { flexDirection: 'row', gap: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  infoDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  infoBox: { padding: 10 },
  buttonsGrid: { flexDirection: 'row', gap: 8 },
  stats: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 10 },
  stat: { flex: 1, gap: 2 },
  tabs: { flexDirection: 'row', gap: 18, borderBottomWidth: 1 },
  tab: { paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, borderBottomWidth: 1 },
  empty: { paddingVertical: 24, textAlign: 'center' },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  bar: { height: 4, marginTop: 8, flexDirection: 'row', alignItems: 'center' },
  barFill: { height: 4 },
  barTick: { position: 'absolute', right: 0, width: 1.5, height: 10 },
  markButton: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
});
