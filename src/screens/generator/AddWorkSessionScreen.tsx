import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Appbar, TextInput, HelperText, Button, Surface, Text, Banner, Chip } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { WorkSession } from '../../models/types';
import { saveWorkSession, getWorkSessions, deleteWorkSession } from '../../utils/storage';
import { generateId, calculateHours, getCurrentTime } from '../../utils/calculations';
import { useAppTheme } from '../../theme/useAppTheme';
import { DeleteConfirmDialog } from '../../components/DeleteConfirmDialog';

type AddWorkSessionScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AddWorkSession'>;
  route: RouteProp<RootStackParamList, 'AddWorkSession'>;
};

export default function AddWorkSessionScreen({ navigation, route }: AddWorkSessionScreenProps) {
  const theme = useAppTheme();
  const { generatorId, sessionId } = route.params;

  const [existingSession, setExistingSession] = useState<WorkSession | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [notes, setNotes] = useState('');
  const [keepActive, setKeepActive] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

  const handleDelete = async () => {
    setShowDeleteDialog(false);
    try {
      if (sessionId) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        await deleteWorkSession(sessionId);
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete work session');
      console.error(error);
    }
  };

  const handleSave = async () => {
    if (!date.trim()) {
      Alert.alert('Error', 'Please enter a date');
      return;
    }

    if (!startTime.trim()) {
      Alert.alert('Error', 'Please enter a start time');
      return;
    }

    if (isActiveSession && keepActive) {
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.goBack();
      } catch (error) {
        Alert.alert('Error', 'Failed to save work session');
        console.error(error);
      }
      return;
    }

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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save work session');
      console.error(error);
    }
  };

  const title = isEditing
    ? (isActiveSession ? 'Edit Active Session' : 'Edit Work Session')
    : 'Add Work Session';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Action icon="close" onPress={() => navigation.goBack()} />
        <Appbar.Content title={title} titleStyle={styles.headerTitle} />
        <Appbar.Action icon="check" onPress={handleSave} />
      </Appbar.Header>

      {isActiveSession && (
        <Banner
          visible
          icon="information"
          actions={[]}
          style={{ backgroundColor: theme.colors.tertiaryContainer }}
        >
          Editing active session. Modify start time/date to keep running, or set an end time to complete it.
        </Banner>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          mode="outlined"
          label="Date *"
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          left={<TextInput.Icon icon="calendar" />}
          style={styles.input}
        />
        <HelperText type="info" visible>
          Format: YYYY-MM-DD (e.g., 2024-01-15)
        </HelperText>

        <TextInput
          mode="outlined"
          label="Start Time *"
          value={startTime}
          onChangeText={setStartTime}
          placeholder="HH:MM"
          left={<TextInput.Icon icon="clock-start" />}
          style={styles.input}
        />
        <HelperText type="info" visible>
          Format: HH:MM (e.g., 09:30)
        </HelperText>

        <TextInput
          mode="outlined"
          label={isActiveSession ? 'End Time (Optional)' : 'End Time *'}
          value={endTime}
          onChangeText={(text) => {
            setEndTime(text);
            if (isActiveSession) {
              setKeepActive(!text.trim());
            }
          }}
          placeholder={isActiveSession ? 'Leave empty to keep running' : 'HH:MM'}
          left={<TextInput.Icon icon="clock-end" />}
          style={styles.input}
        />
        <HelperText type="info" visible>
          {isActiveSession
            ? 'Clear this field to save without completing the session'
            : 'Format: HH:MM (e.g., 17:30)'}
        </HelperText>

        {endTime.trim() && (
          <Surface elevation={1} style={styles.durationCard}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Duration
            </Text>
            <Text variant="headlineMedium" style={{ color: theme.colors.primary, fontWeight: '700' }}>
              {hours > 0 ? `${hours.toFixed(1)} hours` : 'Invalid time range'}
            </Text>
          </Surface>
        )}

        {isActiveSession && !endTime.trim() && (
          <Chip
            icon="check-circle"
            style={[styles.activeChip, { backgroundColor: theme.colors.tertiaryContainer }]}
            textStyle={{ color: theme.colors.onTertiaryContainer }}
          >
            Session will remain active
          </Chip>
        )}

        <TextInput
          mode="outlined"
          label="Notes (Optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes about this session..."
          left={<TextInput.Icon icon="note-text" />}
          multiline
          numberOfLines={4}
          style={styles.input}
        />

        {isEditing && (
          <Button
            mode="contained"
            buttonColor={theme.colors.error}
            textColor={theme.colors.onError}
            icon="delete"
            onPress={() => setShowDeleteDialog(true)}
            style={styles.deleteButton}
            contentStyle={styles.deleteButtonContent}
          >
            Delete Work Session
          </Button>
        )}
      </ScrollView>

      <DeleteConfirmDialog
        visible={showDeleteDialog}
        title="Delete Work Session"
        message="Are you sure you want to delete this work session? This cannot be undone."
        onDismiss={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: '600',
  },
  content: {
    padding: 16,
    paddingTop: 24,
  },
  input: {
    marginBottom: 4,
  },
  durationCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    gap: 4,
  },
  activeChip: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  deleteButton: {
    marginTop: 16,
    marginBottom: 24,
  },
  deleteButtonContent: {
    paddingVertical: 4,
  },
});
