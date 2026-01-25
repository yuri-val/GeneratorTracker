import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  deleteWorkSession,
  deleteRefill,
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
import { Colors } from '../../constants/colors';
import { WorkSessionsList } from '../../components/WorkSessionsList';
import { RefillsList } from '../../components/RefillsList';

type GeneratorDetailScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'GeneratorDetail'>;
  route: RouteProp<RootStackParamList, 'GeneratorDetail'>;
};

const Tab = createMaterialTopTabNavigator();

export default function GeneratorDetailScreen({ navigation, route }: GeneratorDetailScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const { generatorId } = route.params;

  const [generator, setGenerator] = useState<Generator | null>(null);
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
  const [refills, setRefills] = useState<Refill[]>([]);
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute for active session display
  useEffect(() => {
    if (activeSession) {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 60000); // Update every minute
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

  const handleDeleteGenerator = () => {
    Alert.alert(
      'Delete Generator',
      'Are you sure? This will delete all work sessions and refills.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGenerator(generatorId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete generator');
            }
          },
        },
      ]
    );
  };

  const handleDeleteSession = (sessionId: string) => {
    Alert.alert('Delete Work Session', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteWorkSession(sessionId);
            await loadData();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete work session');
          }
        },
      },
    ]);
  };

  const handleDeleteRefill = (refillId: string) => {
    Alert.alert('Delete Refill', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRefill(refillId);
            await loadData();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete refill');
          }
        },
      },
    ]);
  };

  if (!generator) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textMuted }]}>Generator not found</Text>
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

  // Tab Screen Components
  const WorkSessionsTab = () => (
    <WorkSessionsList
      sessions={workSessions.filter(s => !s.isActive)}
      colors={colors}
      onSessionPress={(sessionId) => navigation.navigate('AddWorkSession', { generatorId, sessionId })}
      onRefresh={onRefresh}
      refreshing={refreshing}
      onAddPress={() => navigation.navigate('AddWorkSession', { generatorId })}
    />
  );

  const RefillsTab = () => (
    <RefillsList
      refills={refills}
      colors={colors}
      onRefillPress={(refillId) => navigation.navigate('AddRefill', { generatorId, refillId })}
      onRefresh={onRefresh}
      refreshing={refreshing}
      onAddPress={() => navigation.navigate('AddRefill', { generatorId })}
    />
  );

  const renderHeader = () => (
    <>
      {activeSession ? (
        <View style={[styles.activeSessionCard, { backgroundColor: colors.success, borderColor: colors.success }]}>
          <Text style={styles.activeSessionTitle}>🟢 Session Running</Text>
          <Text style={styles.activeSessionTime}>
            Started: {formatTime(activeSession.startTime)}
          </Text>
          <Text style={styles.activeSessionDuration}>
            {activeHours.toFixed(1)} hours elapsed
          </Text>
          <View style={styles.activeSessionButtons}>
            <TouchableOpacity
              style={[styles.stopButton, { backgroundColor: colors.error }]}
              onPress={handleStopSession}
            >
              <Text style={styles.buttonText}>⏹ STOP</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: colors.background, borderColor: '#fff' }]}
              onPress={handleOpenActiveSession}
            >
              <Text style={[styles.editButtonText, { color: colors.text }]}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: colors.primary }]}
          onPress={handleStartSession}
        >
          <Text style={styles.startButtonText}>▶ START SESSION</Text>
        </TouchableOpacity>
      )}

      <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalHours.toFixed(1)}h</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Hours</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalRefills}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Refills</Text>
          </View>
        </View>
        {stats.averageFuelPerHour > 0 && (
          <View style={[styles.statsRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Average: {stats.averageFuelPerHour.toFixed(2)} L/hour
            </Text>
          </View>
        )}
      </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerTitleContainer}
          onPress={() => navigation.navigate('AddGenerator', { generatorId })}
        >
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {generator.name}
          </Text>
          <Text style={[styles.editHint, { color: colors.textMuted }]}>Tap to edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDeleteGenerator} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: colors.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.headerContainer}>
        {renderHeader()}
      </View>

      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.card,
          },
          tabBarIndicatorStyle: {
            backgroundColor: colors.primary,
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    minWidth: 60,
  },
  headerButtonText: {
    fontSize: 16,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  editHint: {
    fontSize: 11,
    marginTop: 2,
  },
  headerContainer: {
    backgroundColor: 'transparent',
  },
  startButton: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  startButtonText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  activeSessionCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
  },
  activeSessionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  activeSessionTime: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 4,
  },
  activeSessionDuration: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginVertical: 12,
  },
  activeSessionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  stopButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  editButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
});
