import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Alert, FlatList, Pressable, RefreshControl } from 'react-native';
import { Button, Surface, Text, Divider, Chip } from 'react-native-paper';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { Generator, WorkSession, Refill, MaintenanceTask, MaintenanceStatusLevel } from '../../models/types';
import {
  getGenerators,
  getWorkSessions,
  getRefills,
  getMaintenanceTasks,
  saveMaintenanceTask,
  deleteGenerator,
  getActiveWorkSession,
  saveWorkSession,
} from '../../utils/storage';
import {
  calculateGeneratorStats,
  formatTime,
  getCurrentTime,
  getCurrentDate,
  generateId,
  calculateActiveSessionHours,
  calculateHours,
  getGeneratorMaintenanceSummary,
  markTaskServiced,
  calculateMaintenanceStatus,
  formatDate,
} from '../../utils/calculations';
import { useAppTheme } from '../../theme/useAppTheme';
import { StatBlock } from '../../components/StatBlock';
import { GradientCard } from '../../components/GradientCard';
import { WorkSessionsList } from '../../components/WorkSessionsList';
import { RefillsList } from '../../components/RefillsList';
import { MaintenanceList } from '../../components/MaintenanceList';
import { DeleteConfirmDialog } from '../../components/DeleteConfirmDialog';
import { appColors } from '../../theme';
import { ScreenHeader, type HeaderAction } from '../../components/ScreenHeader';
import { PlatformSegmented } from '../../components/PlatformSegmented';
import { GroupedListRow } from '../../components/GroupedListRow';
import { AppIcon } from '../../components/AppIcon';
import { describeMaintenance } from '../../components/MaintenanceList';
import { ICONS } from '../../constants/icons';
import { isIOS, surfaces, textColors } from '../../theme/platform';

type GeneratorDetailScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'GeneratorDetail'>;
  route: RouteProp<RootStackParamList, 'GeneratorDetail'>;
};

const Tab = createMaterialTopTabNavigator();

type Segment = 'sessions' | 'refills' | 'maintenance';

export default function GeneratorDetailScreen({ navigation, route }: GeneratorDetailScreenProps) {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const { generatorId } = route.params;

  const [generator, setGenerator] = useState<Generator | null>(null);
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
  const [refills, setRefills] = useState<Refill[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [segment, setSegment] = useState<Segment>('sessions');

  useEffect(() => {
    if (activeSession) {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [activeSession]);

  const loadData = async () => {
    try {
      const generators = await getGenerators();
      const gen = generators.find(g => g.id === generatorId);
      setGenerator(gen || null);

      const sessions = await getWorkSessions(generatorId);
      setWorkSessions(sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

      const active = await getActiveWorkSession(generatorId);
      setActiveSession(active);

      const refillsList = await getRefills(generatorId);
      setRefills(refillsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

      const tasks = await getMaintenanceTasks(generatorId);
      setMaintenanceTasks(tasks.sort((a, b) => a.title.localeCompare(b.title)));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [generatorId])
  );

  const handleStartSession = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const now = new Date().toISOString();
      const newSession: WorkSession = {
        id: generateId(),
        generatorId,
        date: getCurrentDate(),
        startTime: getCurrentTime(),
        hours: 0,
        createdAt: now,
        isActive: true,
        lastModified: now,
        syncStatus: 'pending',
      };
      await saveWorkSession(newSession);
      setActiveSession(newSession);
      await loadData();
      Alert.alert(t('common.success'), t('detail.sessionStarted'));
    } catch (error) {
      Alert.alert(t('common.error'), t('detail.failedToStartSession'));
      console.error(error);
    }
  };

  const handleStopSession = async () => {
    if (!activeSession) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      const endTime = getCurrentTime();
      const hours = calculateHours(activeSession.startTime, endTime);
      const updatedSession: WorkSession = {
        ...activeSession,
        endTime,
        hours: Math.round(hours * 10) / 10,
        isActive: false,
        lastModified: new Date().toISOString(),
        syncStatus: 'pending',
      };
      await saveWorkSession(updatedSession);
      setActiveSession(null);
      await loadData();
      Alert.alert(t('common.success'), t('detail.sessionStopped', { hours: updatedSession.hours.toFixed(1) }));
    } catch (error) {
      Alert.alert(t('common.error'), t('detail.failedToStopSession'));
      console.error(error);
    }
  };

  const handleMarkServiced = async (task: MaintenanceTask) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const currentHours = calculateGeneratorStats(
        workSessions.filter(s => !s.isActive),
        []
      ).totalHours;
      const updated = markTaskServiced(task, currentHours, getCurrentDate());
      await saveMaintenanceTask(updated);
      await loadData();
      Alert.alert(t('common.success'), t('maintenance.marked'));
    } catch (error) {
      Alert.alert(t('common.error'), t('maintenance.saveError'));
      console.error(error);
    }
  };

  const handleOpenActiveSession = () => {
    if (activeSession) {
      navigation.navigate('AddWorkSession', { generatorId, sessionId: activeSession.id });
    }
  };

  const handleDeleteGenerator = async () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    setShowDeleteDialog(false);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await deleteGenerator(generatorId);
      navigation.goBack();
      Alert.alert(t('common.success'), t('detail.generatorDeleted'));
    } catch (error) {
      Alert.alert(t('common.error'), t('detail.failedToDeleteGenerator'));
    }
  };

  if (!generator) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScreenHeader title={t('common.notFound')} leading="back" onLeadingPress={() => navigation.goBack()} />
        <View style={styles.errorContainer}>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('detail.generatorNotFound')}
          </Text>
        </View>
      </View>
    );
  }

  const stats = calculateGeneratorStats(
    workSessions.filter(s => !s.isActive),
    refills
  );

  const activeHours = activeSession
    ? calculateActiveSessionHours(activeSession.startTime, activeSession.date)
    : 0;

  const maintenanceSummary = getGeneratorMaintenanceSummary(maintenanceTasks, stats.totalHours);
  const maintenanceColor =
    maintenanceSummary.level === 'due'
      ? theme.colors.error
      : maintenanceSummary.level === 'soon'
      ? appColors.warning
      : appColors.success;

  const completedSessions = workSessions.filter(s => !s.isActive);
  const openGeneratorEditor = () => navigation.navigate('AddGenerator', { generatorId });

  const summary = (
    <View>
      {!!generator.model && (
        <Text variant="bodyLarge" style={[styles.model, { color: textColors(theme).secondary }]}>
          {generator.model}
        </Text>
      )}
      {activeSession ? (
        <Animated.View entering={FadeIn.duration(400)}>
          <GradientCard colors={[appColors.activeSession, appColors.activeSessionDark]}>
            <View style={styles.activeContent}>
              <Text variant="titleMedium" style={styles.whiteText}>
                {t('detail.activeSession')}
              </Text>
              <Text variant="displaySmall" style={[styles.whiteText, { fontWeight: '700' }]}>
                {activeHours.toFixed(1)}{t('common.hoursAbbr')}
              </Text>
              <Text variant="bodyMedium" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {t('detail.startedAt')}: {formatTime(activeSession.startTime, i18n.language)}
              </Text>
              <View style={styles.activeButtons}>
                <Button
                  mode="contained"
                  buttonColor={theme.colors.error}
                  textColor={theme.colors.onError}
                  icon={ICONS.stop.mci}
                  onPress={handleStopSession}
                  testID="stop-session"
                >
                  {t('detail.stopSession')}
                </Button>
                <Button
                  mode="outlined"
                  textColor="#fff"
                  style={{ borderColor: '#fff' }}
                  onPress={handleOpenActiveSession}
                >
                  {t('common.edit')}
                </Button>
              </View>
            </View>
          </GradientCard>
        </Animated.View>
      ) : (
        <Button
          mode="contained"
          icon={ICONS.play.mci}
          onPress={handleStartSession}
          style={styles.startButton}
          contentStyle={styles.startButtonContent}
          labelStyle={styles.startButtonLabel}
          testID="start-session"
        >
          {t('detail.startSession')}
        </Button>
      )}

      <Animated.View entering={FadeInUp.delay(200)}>
        <Surface
          elevation={isIOS ? 0 : 2}
          style={[styles.statsCard, isIOS && { backgroundColor: surfaces(theme).card }]}
        >
          <View style={styles.statsRow}>
            <StatBlock
              value={`${stats.totalHours.toFixed(1)}${t('common.hoursAbbr')}`}
              label={t('home.totalHours')}
              icon="clock"
              color={theme.colors.secondary}
            />
            <Divider style={styles.statDivider} />
            <StatBlock
              value={stats.totalRefills.toString()}
              label={t('home.refills')}
              icon="fuel"
              color={theme.colors.primary}
            />
          </View>
          {stats.averageFuelPerHour > 0 && (
            <>
              <Divider style={{ marginVertical: 12 }} />
              <Chip
                icon={({ size, color }) => <AppIcon name="chartLine" size={size} color={color} />}
                compact
                style={{ alignSelf: 'center' }}
              >
                {t('common.avg')}: {stats.averageFuelPerHour.toFixed(2)} {t('common.litersPerHour')}
              </Chip>
            </>
          )}
          {maintenanceSummary.level !== 'ok' && (
            <>
              <Divider style={{ marginVertical: 12 }} />
              <Chip
                icon={({ size }) => <AppIcon name="wrench" size={size} color={maintenanceColor} />}
                compact
                style={{ alignSelf: 'center', backgroundColor: maintenanceColor + '22' }}
                textStyle={{ color: maintenanceColor }}
              >
                {maintenanceSummary.dueCount > 0
                  ? t('maintenance.badgeDue', { count: maintenanceSummary.dueCount })
                  : t('maintenance.badgeSoon', { count: maintenanceSummary.soonCount })}
              </Chip>
            </>
          )}
        </Surface>
      </Animated.View>
    </View>
  );

  const deleteDialog = (
    <DeleteConfirmDialog
      visible={showDeleteDialog}
      title={t('detail.deleteGeneratorTitle')}
      message={t('detail.deleteGeneratorConfirm')}
      onDismiss={() => setShowDeleteDialog(false)}
      onConfirm={confirmDelete}
    />
  );

  if (isIOS) {
    return (
      <GeneratorDetailIOS
        generatorName={generator.name}
        summary={summary}
        segment={segment}
        onSegmentChange={setSegment}
        sessions={completedSessions}
        refills={refills}
        tasks={maintenanceTasks}
        engineHours={stats.totalHours}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEdit={openGeneratorEditor}
        onDelete={handleDeleteGenerator}
        onOpenSession={sessionId => navigation.navigate('AddWorkSession', { generatorId, sessionId })}
        onOpenRefill={refillId => navigation.navigate('AddRefill', { generatorId, refillId })}
        onOpenTask={taskId => navigation.navigate('AddMaintenance', { generatorId, taskId })}
        onAdd={() =>
          segment === 'sessions'
            ? navigation.navigate('AddWorkSession', { generatorId })
            : segment === 'refills'
            ? navigation.navigate('AddRefill', { generatorId })
            : navigation.navigate('AddMaintenance', { generatorId })
        }
        onMarkServiced={handleMarkServiced}
        deleteDialog={deleteDialog}
      />
    );
  }

  const WorkSessionsTab = () => (
    <WorkSessionsList
      sessions={completedSessions}
      onSessionPress={(sessionId) => navigation.navigate('AddWorkSession', { generatorId, sessionId })}
      onRefresh={onRefresh}
      refreshing={refreshing}
      onAddPress={() => navigation.navigate('AddWorkSession', { generatorId })}
    />
  );

  const RefillsTab = () => (
    <RefillsList
      refills={refills}
      onRefillPress={(refillId) => navigation.navigate('AddRefill', { generatorId, refillId })}
      onRefresh={onRefresh}
      refreshing={refreshing}
      onAddPress={() => navigation.navigate('AddRefill', { generatorId })}
    />
  );

  const MaintenanceTab = () => (
    <MaintenanceList
      tasks={maintenanceTasks}
      currentEngineHours={stats.totalHours}
      onTaskPress={(taskId) => navigation.navigate('AddMaintenance', { generatorId, taskId })}
      onAddPress={() => navigation.navigate('AddMaintenance', { generatorId })}
      onMarkServiced={handleMarkServiced}
      onRefresh={onRefresh}
      refreshing={refreshing}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader
        title={generator.name}
        leading="back"
        onLeadingPress={() => navigation.goBack()}
        onTitlePress={openGeneratorEditor}
        titleTestID="detail-edit-generator"
        actions={[
          {
            key: 'edit',
            label: t('common.edit'),
            icon: 'edit',
            onPress: openGeneratorEditor,
            testID: 'detail-edit-action',
          },
          {
            key: 'delete',
            label: t('common.delete'),
            icon: 'delete',
            destructive: true,
            onPress: handleDeleteGenerator,
            testID: 'detail-delete-generator',
          },
        ]}
      />

      {summary}

      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
          tabBarStyle: { backgroundColor: theme.colors.elevation.level2 },
          tabBarIndicatorStyle: {
            backgroundColor: theme.colors.primary,
            height: 3,
            borderRadius: 1.5,
          },
          tabBarLabelStyle: {
            fontWeight: '600',
            textTransform: 'none',
          },
        }}
      >
        <Tab.Screen
          name="Work Sessions"
          component={WorkSessionsTab}
          options={{
            tabBarLabel: `${t('detail.workSessions')} (${completedSessions.length})`,
          }}
        />
        <Tab.Screen
          name="Refills"
          component={RefillsTab}
          options={{
            tabBarLabel: `${t('detail.refills')} (${refills.length})`,
          }}
        />
        <Tab.Screen
          name="Maintenance"
          component={MaintenanceTab}
          options={{
            tabBarLabel: `${t('maintenance.tabLabel')} (${maintenanceTasks.length})`,
          }}
        />
      </Tab.Navigator>

      {deleteDialog}
    </View>
  );
}

type ListRow =
  | { kind: 'session'; item: WorkSession }
  | { kind: 'refill'; item: Refill }
  | { kind: 'task'; item: MaintenanceTask };

interface GeneratorDetailIOSProps {
  generatorName: string;
  summary: React.ReactNode;
  segment: Segment;
  onSegmentChange: (segment: Segment) => void;
  sessions: WorkSession[];
  refills: Refill[];
  tasks: MaintenanceTask[];
  engineHours: number;
  refreshing: boolean;
  onRefresh: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAdd: () => void;
  onOpenSession: (id: string) => void;
  onOpenRefill: (id: string) => void;
  onOpenTask: (id: string) => void;
  onMarkServiced: (task: MaintenanceTask) => void;
  deleteDialog: React.ReactNode;
}

/**
 * iOS layout (HIG): one scrolling inset-grouped list — the summary, a segmented control
 * for the record type and the records as grouped rows; add/edit/delete live in the
 * navigation bar ("+" and a "More" pull-down menu).
 */
function GeneratorDetailIOS(props: GeneratorDetailIOSProps) {
  const { segment, sessions, refills, tasks, engineHours } = props;
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const surface = surfaces(theme);
  const text = textColors(theme);

  const rows: ListRow[] =
    segment === 'sessions'
      ? sessions.map(item => ({ kind: 'session' as const, item }))
      : segment === 'refills'
      ? refills.map(item => ({ kind: 'refill' as const, item }))
      : tasks.map(item => ({ kind: 'task' as const, item }));

  const addLabel =
    segment === 'sessions' ? t('workSession.addButton') : segment === 'refills' ? t('refill.addButton') : t('maintenance.addButton');

  const actions: HeaderAction[] = [{ key: 'add', label: addLabel, icon: 'add', onPress: props.onAdd, testID: 'detail-add' }];

  const statusColor = (level: MaintenanceStatusLevel) =>
    level === 'due' ? theme.colors.error : level === 'soon' ? appColors.warning : appColors.success;
  const statusLabel = (level: MaintenanceStatusLevel) =>
    level === 'due' ? t('maintenance.statusDue') : level === 'soon' ? t('maintenance.statusSoon') : t('maintenance.statusOk');

  const renderItem = ({ item: row, index }: { item: ListRow; index: number }) => {
    const position = { first: index === 0, last: index === rows.length - 1 };
    if (row.kind === 'session') {
      const s = row.item;
      return (
        <GroupedListRow
          {...position}
          title={formatDate(s.date, i18n.language)}
          subtitle={`${formatTime(s.startTime, i18n.language)} – ${s.endTime ? formatTime(s.endTime, i18n.language) : t('workSession.inProgress')}`}
          detail={s.notes || undefined}
          icon="clock"
          iconColor={theme.colors.secondary}
          value={`${s.hours.toFixed(1)}${t('common.hoursAbbr')}`}
          onPress={() => props.onOpenSession(s.id)}
        />
      );
    }
    if (row.kind === 'refill') {
      const r = row.item;
      return (
        <GroupedListRow
          {...position}
          title={formatDate(r.date, i18n.language)}
          subtitle={r.notes || undefined}
          icon="fuel"
          iconColor={theme.colors.primary}
          value={`${r.amount}${t('common.litersAbbr')}`}
          onPress={() => props.onOpenRefill(r.id)}
        />
      );
    }
    const task = row.item;
    const status = calculateMaintenanceStatus(task, engineHours);
    const color = statusColor(status.level);
    const { interval, remaining } = describeMaintenance(task, status, t);
    return (
      <GroupedListRow
        {...position}
        title={task.title}
        subtitle={remaining ?? interval}
        detail={task.notes || undefined}
        icon="wrench"
        iconColor={color}
        value={statusLabel(status.level)}
        valueColor={color}
        accessory={
          <Pressable
            onPress={() => props.onMarkServiced(task)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('maintenance.markServiced')}
            style={({ pressed }) => pressed && { opacity: 0.5 }}
          >
            <AppIcon name="markServiced" size={24} color={theme.colors.primary} />
          </Pressable>
        }
        onPress={() => props.onOpenTask(task.id)}
      />
    );
  };

  const empty =
    segment === 'sessions'
      ? { icon: 'timerOff' as const, text: t('workSession.emptyState') }
      : segment === 'refills'
      ? { icon: 'fuelOff' as const, text: t('refill.emptyState') }
      : { icon: 'wrenchOutline' as const, text: t('maintenance.emptyState') };

  return (
    <>
      <ScreenHeader
        title={props.generatorName}
        leading="back"
        scrollEdge
        actions={actions}
        menu={{
          label: t('common.more'),
          icon: 'more',
          actions: [
            { key: 'edit', label: t('common.edit'), icon: 'edit', onPress: props.onEdit },
            { key: 'delete', label: t('common.delete'), icon: 'delete', destructive: true, onPress: props.onDelete },
          ],
        }}
      />
      <FlatList
        data={rows}
        keyExtractor={row => `${row.kind}-${row.item.id}`}
        renderItem={renderItem}
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: surface.screen }}
        contentContainerStyle={styles.iosContent}
        refreshControl={<RefreshControl refreshing={props.refreshing} onRefresh={props.onRefresh} />}
        ListHeaderComponent={
          <View>
            {props.summary}
            <PlatformSegmented
              value={segment}
              onValueChange={props.onSegmentChange}
              options={[
                { value: 'sessions', label: `${t('detail.workSessions')} (${sessions.length})` },
                { value: 'refills', label: `${t('detail.refills')} (${refills.length})` },
                { value: 'maintenance', label: `${t('maintenance.tabLabel')} (${tasks.length})` },
              ]}
              style={styles.iosSegmented}
              testID="detail-segments"
            />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.iosEmpty}>
            <AppIcon name={empty.icon} size={44} color={theme.colors.outline} />
            <Text variant="bodyLarge" style={{ color: text.secondary, marginTop: 12, textAlign: 'center' }}>
              {empty.text}
            </Text>
          </View>
        }
      />
      {props.deleteDialog}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeContent: {
    alignItems: 'center',
    gap: 4,
  },
  whiteText: {
    color: '#ffffff',
  },
  activeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  startButton: {
    margin: 16,
  },
  startButtonContent: {
    height: 56,
  },
  startButtonLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  iosContent: {
    paddingBottom: 32,
  },
  model: {
    marginHorizontal: 20,
    marginTop: 12,
  },
  iosSegmented: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  iosEmpty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
});
