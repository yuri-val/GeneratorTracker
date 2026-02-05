import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Appbar, Button, Surface, Text, Divider, Chip } from 'react-native-paper';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { Generator, WorkSession, Refill } from '../../models/types';
import {
  getGenerators,
  getWorkSessions,
  getRefills,
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
} from '../../utils/calculations';
import { useAppTheme } from '../../theme/useAppTheme';
import { StatBlock } from '../../components/StatBlock';
import { GradientCard } from '../../components/GradientCard';
import { WorkSessionsList } from '../../components/WorkSessionsList';
import { RefillsList } from '../../components/RefillsList';
import { DeleteConfirmDialog } from '../../components/DeleteConfirmDialog';
import { appColors } from '../../theme';

type GeneratorDetailScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'GeneratorDetail'>;
  route: RouteProp<RootStackParamList, 'GeneratorDetail'>;
};

const Tab = createMaterialTopTabNavigator();

export default function GeneratorDetailScreen({ navigation, route }: GeneratorDetailScreenProps) {
  const theme = useAppTheme();
  const { generatorId } = route.params;

  const [generator, setGenerator] = useState<Generator | null>(null);
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
  const [refills, setRefills] = useState<Refill[]>([]);
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
      const newSession: WorkSession = {
        id: generateId(),
        generatorId,
        date: getCurrentDate(),
        startTime: getCurrentTime(),
        hours: 0,
        createdAt: new Date().toISOString(),
        isActive: true,
      };
      await saveWorkSession(newSession);
      setActiveSession(newSession);
      await loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to start work session');
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
      };
      await saveWorkSession(updatedSession);
      setActiveSession(null);
      await loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to stop work session');
      console.error(error);
    }
  };

  const handleOpenActiveSession = () => {
    if (activeSession) {
      navigation.navigate('AddWorkSession', { generatorId, sessionId: activeSession.id });
    }
  };

  const handleDeleteGenerator = async () => {
    setShowDeleteDialog(false);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await deleteGenerator(generatorId);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete generator');
    }
  };

  if (!generator) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Not Found" />
        </Appbar.Header>
        <View style={styles.errorContainer}>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            Generator not found
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

  const WorkSessionsTab = () => (
    <WorkSessionsList
      sessions={workSessions.filter(s => !s.isActive)}
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content
          title={generator.name}
          subtitle={generator.model || 'Tap to edit'}
          onPress={() => navigation.navigate('AddGenerator', { generatorId })}
        />
        <Appbar.Action
          icon="delete"
          iconColor={theme.colors.error}
          onPress={() => setShowDeleteDialog(true)}
        />
      </Appbar.Header>

      <View>
        {activeSession ? (
          <Animated.View entering={FadeIn.duration(400)}>
            <GradientCard colors={[appColors.activeSession, appColors.activeSessionDark]}>
              <View style={styles.activeContent}>
                <Text variant="titleMedium" style={styles.whiteText}>
                  Session Running
                </Text>
                <Text variant="displaySmall" style={[styles.whiteText, { fontWeight: '700' }]}>
                  {activeHours.toFixed(1)}h
                </Text>
                <Text variant="bodyMedium" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Started: {formatTime(activeSession.startTime)}
                </Text>
                <View style={styles.activeButtons}>
                  <Button
                    mode="contained"
                    buttonColor={theme.colors.error}
                    textColor={theme.colors.onError}
                    icon="stop"
                    onPress={handleStopSession}
                  >
                    STOP
                  </Button>
                  <Button
                    mode="outlined"
                    textColor="#fff"
                    style={{ borderColor: '#fff' }}
                    onPress={handleOpenActiveSession}
                  >
                    Edit
                  </Button>
                </View>
              </View>
            </GradientCard>
          </Animated.View>
        ) : (
          <Button
            mode="contained"
            icon="play"
            onPress={handleStartSession}
            style={styles.startButton}
            contentStyle={styles.startButtonContent}
            labelStyle={styles.startButtonLabel}
          >
            START SESSION
          </Button>
        )}

        <Animated.View entering={FadeInUp.delay(200)}>
          <Surface elevation={2} style={styles.statsCard}>
            <View style={styles.statsRow}>
              <StatBlock
                value={`${stats.totalHours.toFixed(1)}h`}
                label="Total Hours"
                icon="clock-outline"
                color={theme.colors.secondary}
              />
              <Divider style={styles.statDivider} />
              <StatBlock
                value={stats.totalRefills.toString()}
                label="Refills"
                icon="fuel"
                color={theme.colors.primary}
              />
            </View>
            {stats.averageFuelPerHour > 0 && (
              <>
                <Divider style={{ marginVertical: 12 }} />
                <Chip icon="chart-line" compact style={{ alignSelf: 'center' }}>
                  Avg: {stats.averageFuelPerHour.toFixed(2)} L/hour
                </Chip>
              </>
            )}
          </Surface>
        </Animated.View>
      </View>

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
            tabBarLabel: `Sessions (${workSessions.filter(s => !s.isActive).length})`,
          }}
        />
        <Tab.Screen
          name="Refills"
          component={RefillsTab}
          options={{
            tabBarLabel: `Refills (${refills.length})`,
          }}
        />
      </Tab.Navigator>

      <DeleteConfirmDialog
        visible={showDeleteDialog}
        title="Delete Generator"
        message="Are you sure? This will delete all work sessions and refills for this generator."
        onDismiss={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteGenerator}
      />
    </View>
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
});
