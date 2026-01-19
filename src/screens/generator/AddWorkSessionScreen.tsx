import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { WorkSession } from '../../models/types';
import { saveWorkSession, getWorkSessions } from '../../utils/storage';
import { generateId, calculateHours, getCurrentTime } from '../../utils/calculations';
import { Colors } from '../../constants/colors';

type AddWorkSessionScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AddWorkSession'>;
  route: RouteProp<RootStackParamList, 'AddWorkSession'>;
};

export default function AddWorkSessionScreen({ navigation, route }: AddWorkSessionScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { generatorId, sessionId } = route.params;

  const [existingSession, setExistingSession] = useState<WorkSession | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [notes, setNotes] = useState('');
  const [keepActive, setKeepActive] = useState(false);

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const sessions = await getWorkSessions(generatorId);
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        setExistingSession(session);
        setDate(session.date);
        setStartTime(session.startTime);
        setEndTime(session.endTime || getCurrentTime());
        setNotes(session.notes || '');
        setKeepActive(!!session.isActive);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const hours = endTime ? calculateHours(startTime, endTime) : 0;
  const isEditing = !!existingSession;
  const isActiveSession = existingSession?.isActive;

  const handleSave = async () => {
    if (!date.trim()) {
      Alert.alert('Error', 'Please enter a date');
      return;
    }

    if (!startTime.trim()) {
      Alert.alert('Error', 'Please enter a start time');
      return;
    }

    // For active sessions, end time is optional
    if (isActiveSession && keepActive) {
      // Save as active session (no end time)
      try {
        const session: WorkSession = {
          id: existingSession?.id || generateId(),
          generatorId,
          date,
          startTime,
          hours: 0,
          notes: notes.trim() || undefined,
          createdAt: existingSession?.createdAt || new Date().toISOString(),
          isActive: true,
        };

        await saveWorkSession(session);
        navigation.goBack();
      } catch (error) {
        Alert.alert('Error', 'Failed to save work session');
        console.error(error);
      }
      return;
    }

    // For completed sessions or completing an active session
    if (!endTime.trim()) {
      Alert.alert('Error', 'Please enter an end time');
      return;
    }

    if (hours <= 0) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }

    try {
      const session: WorkSession = {
        id: existingSession?.id || generateId(),
        generatorId,
        date,
        startTime,
        endTime,
        hours,
        notes: notes.trim() || undefined,
        createdAt: existingSession?.createdAt || new Date().toISOString(),
        isActive: false,
      };

      await saveWorkSession(session);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save work session');
      console.error(error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: colors.primary }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isEditing ? (isActiveSession ? 'Edit Active Session' : 'Edit Work Session') : 'Add Work Session'}
        </Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: colors.primary, fontWeight: '600' }]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isActiveSession && (
          <View style={[styles.infoCard, { backgroundColor: colors.success }]}>
            <Text style={styles.infoText}>
              💡 Editing active session: Modify start time/date and save to keep it running, or set an end time to complete it.
            </Text>
          </View>
        )}

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Date *</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Format: YYYY-MM-DD (e.g., 2024-01-15)
          </Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Start Time *</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            value={startTime}
            onChangeText={setStartTime}
            placeholder="HH:MM"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={[styles.hint, { color: colors.textMuted }]}>Format: HH:MM (e.g., 09:30)</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text }]}>
            End Time {isActiveSession ? '(Optional - leave empty to keep running)' : '*'}
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            value={endTime}
            onChangeText={(text) => {
              setEndTime(text);
              if (isActiveSession) {
                setKeepActive(!text.trim());
              }
            }}
            placeholder={isActiveSession ? 'Leave empty to keep running' : 'HH:MM'}
            placeholderTextColor={colors.textMuted}
          />
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            {isActiveSession
              ? 'Clear this field to save without completing the session'
              : 'Format: HH:MM (e.g., 17:30)'}
          </Text>
        </View>

        {endTime.trim() && (
          <View style={[styles.hoursCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.hoursLabel, { color: colors.textMuted }]}>Duration</Text>
            <Text style={[styles.hoursValue, { color: colors.primary }]}>
              {hours > 0 ? `${hours.toFixed(1)} hours` : 'Invalid time range'}
            </Text>
          </View>
        )}

        {isActiveSession && !endTime.trim() && (
          <View style={[styles.activeIndicator, { backgroundColor: colors.success }]}>
            <Text style={styles.activeIndicatorText}>
              ✓ Session will remain active
            </Text>
          </View>
        )}

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Notes (Optional)</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any notes about this work session..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
          />
        </View>
      </ScrollView>
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
  },
  content: {
    padding: 16,
  },
  infoCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 13,
    marginTop: 4,
  },
  hoursCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  hoursLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  hoursValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  activeIndicator: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  activeIndicatorText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
