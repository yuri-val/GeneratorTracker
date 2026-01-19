import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  SectionList,
  Alert,
  RefreshControl,
} from 'react-native';
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
  formatDate,
  formatTime,
  getCurrentTime,
  getCurrentDate,
  generateId,
  calculateActiveSessionHours,
  calculateHours,
} from '../../utils/calculations';
import { Colors } from '../../constants/colors';

type GeneratorDetailScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'GeneratorDetail'>;
  route: RouteProp<RootStackParamList, 'GeneratorDetail'>;
};

type SectionData = {
  title: string;
  data: (WorkSession | Refill)[];
  type: 'session' | 'refill';
};

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

  const sections: SectionData[] = [
    { title: 'Work Sessions', data: workSessions.filter(s => !s.isActive), type: 'session' },
    { title: 'Refills', data: refills, type: 'refill' },
  ];

  const activeHours = activeSession
    ? calculateActiveSessionHours(activeSession.startTime, activeSession.date)
    : 0;

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
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalHours}h</Text>
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
              Average: {stats.averageFuelPerHour} L/hour
            </Text>
          </View>
        )}
      </View>
    </>
  );

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
      <TouchableOpacity
        onPress={() =>
          section.type === 'session'
            ? navigation.navigate('AddWorkSession', { generatorId })
            : navigation.navigate('AddRefill', { generatorId })
        }
      >
        <Text style={[styles.addButton, { color: colors.primary }]}>+ Add</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item, section }: { item: WorkSession | Refill; section: SectionData }) => {
    if (section.type === 'session') {
      const session = item as WorkSession;
      return (
        <TouchableOpacity
          style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => navigation.navigate('AddWorkSession', { generatorId, sessionId: session.id })}
          onLongPress={() => handleDeleteSession(session.id)}
        >
          <View style={styles.itemContent}>
            <Text style={[styles.itemDate, { color: colors.text }]}>{formatDate(session.date)}</Text>
            <Text style={[styles.itemDetail, { color: colors.textMuted }]}>
              {formatTime(session.startTime)} - {session.endTime ? formatTime(session.endTime) : 'In Progress'}
            </Text>
            {session.notes && (
              <Text style={[styles.itemNotes, { color: colors.textMuted }]}>{session.notes}</Text>
            )}
          </View>
          <Text style={[styles.itemValue, { color: colors.primary }]}>{session.hours}h</Text>
        </TouchableOpacity>
      );
    } else {
      const refill = item as Refill;
      return (
        <TouchableOpacity
          style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}
          onLongPress={() => handleDeleteRefill(refill.id)}
        >
          <View style={styles.itemContent}>
            <Text style={[styles.itemDate, { color: colors.text }]}>{formatDate(refill.date)}</Text>
            {refill.notes && (
              <Text style={[styles.itemNotes, { color: colors.textMuted }]}>{refill.notes}</Text>
            )}
          </View>
          <Text style={[styles.itemValue, { color: colors.primary }]}>{refill.amount}L</Text>
        </TouchableOpacity>
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {generator.name}
        </Text>
        <TouchableOpacity onPress={handleDeleteGenerator} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: colors.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={renderHeader}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No work sessions or refills yet
            </Text>
          </View>
        }
      />
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 100,
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
    fontWeight: 'bold',
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
    borderRadius: 8,
  },
  editButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
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
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  itemContent: {
    flex: 1,
  },
  itemDate: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 13,
    marginBottom: 2,
  },
  itemNotes: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  itemValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
});
