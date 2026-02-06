import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, Pressable } from 'react-native';
import { Appbar, TextInput, HelperText, Button, Surface, Text, Banner, Chip } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { WorkSession } from '../../models/types';
import { saveWorkSession, getWorkSessions, deleteWorkSession } from '../../utils/storage';
import { generateId, calculateHours, getCurrentTime, formatDate, formatTime } from '../../utils/calculations';
import { useAppTheme } from '../../theme/useAppTheme';
import { DeleteConfirmDialog } from '../../components/DeleteConfirmDialog';

type AddWorkSessionScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AddWorkSession'>;
  route: RouteProp<RootStackParamList, 'AddWorkSession'>;
};

export default function AddWorkSessionScreen({ navigation, route }: AddWorkSessionScreenProps) {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const { generatorId, sessionId } = route.params;

  const [existingSession, setExistingSession] = useState<WorkSession | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [notes, setNotes] = useState('');
  const [keepActive, setKeepActive] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const onStartTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    setShowStartTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setStartTime(`${hours}:${minutes}`);
    }
  };

  const onEndTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    setShowEndTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;
      setEndTime(timeStr);
      if (isActiveSession) {
        setKeepActive(!timeStr.trim());
      }
    }
  };

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
      Alert.alert(t('common.error'), t('workSession.deleteError'));
      console.error(error);
    }
  };

  const handleSave = async () => {
    if (!date.trim()) {
      Alert.alert(t('common.error'), t('workSession.dateRequired'));
      return;
    }

    if (!startTime.trim()) {
      Alert.alert(t('common.error'), t('workSession.startTimeRequired'));
      return;
    }

    const now = new Date().toISOString();

    if (isActiveSession && keepActive) {
      try {
        const session: WorkSession = {
          id: existingSession?.id || generateId(),
          generatorId,
          date,
          startTime,
          hours: 0,
          notes: notes.trim() || undefined,
          createdAt: existingSession?.createdAt || now,
          isActive: true,
          lastModified: now,
          syncStatus: 'pending',
        };
        await saveWorkSession(session);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.goBack();
      } catch (error) {
        Alert.alert(t('common.error'), t('workSession.saveError'));
        console.error(error);
      }
      return;
    }

    if (!endTime.trim()) {
      Alert.alert(t('common.error'), t('workSession.endTimeRequired'));
      return;
    }

    if (hours <= 0) {
      Alert.alert(t('common.error'), t('workSession.timeRangeError'));
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
        createdAt: existingSession?.createdAt || now,
        isActive: false,
        lastModified: now,
        syncStatus: 'pending',
      };
      await saveWorkSession(session);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      Alert.alert(t('common.error'), t('workSession.saveError'));
      console.error(error);
    }
  };

  const title = isEditing
    ? (isActiveSession ? t('workSession.editActiveTitle') : t('workSession.editTitle'))
    : t('workSession.addTitle');

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
          {t('workSession.editActiveBanner')}
        </Banner>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => setShowDatePicker(true)}>
          <View pointerEvents="none">
            <TextInput
              mode="outlined"
              label={t('workSession.dateLabel')}
              value={formatDate(date, i18n.language)}
              placeholder="YYYY-MM-DD"
              left={<TextInput.Icon icon="calendar" />}
              style={styles.input}
              editable={false}
            />
          </View>
        </Pressable>

        <View style={styles.timeRow}>
          <Pressable style={styles.timeInput} onPress={() => setShowStartTimePicker(true)}>
            <View pointerEvents="none">
              <TextInput
                mode="outlined"
                label={t('workSession.startTimeLabel')}
                value={formatTime(startTime, i18n.language)}
                placeholder="HH:MM"
                left={<TextInput.Icon icon="clock-start" />}
                editable={false}
              />
            </View>
          </Pressable>

          <Pressable style={styles.timeInput} onPress={() => setShowEndTimePicker(true)}>
            <View pointerEvents="none">
              <TextInput
                mode="outlined"
                label={isActiveSession ? t('workSession.endTimeOptionalLabel') : t('workSession.endTimeLabel')}
                value={endTime ? formatTime(endTime, i18n.language) : ''}
                placeholder={isActiveSession ? t('workSession.endTimePlaceholderActive') : 'HH:MM'}
                left={<TextInput.Icon icon="clock-end" />}
                editable={false}
              />
            </View>
          </Pressable>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={new Date(date)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}

        {showStartTimePicker && (
          <DateTimePicker
            value={(() => {
              const [h, m] = startTime.split(':').map(Number);
              const d = new Date();
              d.setHours(h, m, 0, 0);
              return d;
            })()}
            mode="time"
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onStartTimeChange}
          />
        )}

        {showEndTimePicker && (
          <DateTimePicker
            value={(() => {
              const [h, m] = (endTime || '12:00').split(':').map(Number);
              const d = new Date();
              d.setHours(h, m, 0, 0);
              return d;
            })()}
            mode="time"
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onEndTimeChange}
          />
        )}

        {endTime.trim() && (
          <Surface elevation={1} style={styles.durationCard}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('workSession.durationLabel')}
            </Text>
            <Text variant="headlineMedium" style={{ color: theme.colors.primary, fontWeight: '700' }}>
              {hours > 0 ? `${hours.toFixed(1)} ${t('common.hours')}` : t('workSession.invalidTimeRange')}
            </Text>
          </Surface>
        )}

        {isActiveSession && !endTime.trim() && (
          <Chip
            icon="check-circle"
            style={[styles.activeChip, { backgroundColor: theme.colors.tertiaryContainer }]}
            textStyle={{ color: theme.colors.onTertiaryContainer }}
          >
            {t('workSession.sessionWillRemainActive')}
          </Chip>
        )}

        <TextInput
          mode="outlined"
          label={t('workSession.notesLabel')}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('workSession.notesPlaceholder')}
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
            {t('workSession.deleteButton')}
          </Button>
        )}
      </ScrollView>

      <DeleteConfirmDialog
        visible={showDeleteDialog}
        title={t('workSession.deleteTitle')}
        message={t('workSession.deleteConfirm')}
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
  timeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  timeInput: {
    flex: 1,
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
