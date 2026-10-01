import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable, Platform } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { MaintenanceTask } from '../../models/types';
import {
  saveMaintenanceTask,
  getMaintenanceTasks,
  deleteMaintenanceTask,
  getWorkSessions,
} from '../../utils/storage';
import { generateId, formatDate, calculateGeneratorStats, toLocalDateString, parseLocalDate } from '../../utils/calculations';
import { useAppTheme } from '../../theme/useAppTheme';
import { DeleteConfirmDialog } from '../../components/DeleteConfirmDialog';
import { ScreenHeader } from '../../components/ScreenHeader';
import { NativeForm, type FormSection } from '../../components/form/NativeForm';
import { isIOS } from '../../theme/platform';
import { contentColumn } from '../../theme/layout';

type AddMaintenanceScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AddMaintenance'>;
  route: RouteProp<RootStackParamList, 'AddMaintenance'>;
};

export default function AddMaintenanceScreen({ navigation, route }: AddMaintenanceScreenProps) {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const { generatorId, taskId } = route.params;
  const isEditing = !!taskId;

  const [title, setTitle] = useState('');
  const [intervalHours, setIntervalHours] = useState('');
  const [intervalDays, setIntervalDays] = useState('');
  const [lastServiceDate, setLastServiceDate] = useState(toLocalDateString());
  const [lastServiceHours, setLastServiceHours] = useState('0');
  const [notes, setNotes] = useState('');
  const [existingTask, setExistingTask] = useState<MaintenanceTask | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setLastServiceDate(toLocalDateString(selectedDate));
    }
  };

  useEffect(() => {
    if (taskId) {
      loadTask();
    } else {
      prefillCurrentHours();
    }
  }, [taskId]);

  const loadTask = async () => {
    try {
      const tasks = await getMaintenanceTasks(generatorId);
      const task = tasks.find(m => m.id === taskId);
      if (task) {
        setExistingTask(task);
        setTitle(task.title);
        setIntervalHours(task.intervalHours != null ? task.intervalHours.toString() : '');
        setIntervalDays(task.intervalDays != null ? task.intervalDays.toString() : '');
        setLastServiceDate(task.lastServiceDate);
        setLastServiceHours(task.lastServiceHours.toString());
        setNotes(task.notes || '');
      }
    } catch (error) {
      console.error('Error loading maintenance task:', error);
      Alert.alert(t('common.error'), t('maintenance.loadError'));
    }
  };

  // For a new task, default "engine hours at last service" to the generator's
  // current accumulated hours, so the interval counts forward from today.
  const prefillCurrentHours = async () => {
    try {
      const sessions = await getWorkSessions(generatorId);
      const stats = calculateGeneratorStats(sessions.filter(s => !s.isActive), []);
      setLastServiceHours(stats.totalHours.toString());
    } catch (error) {
      console.error('Error reading current engine hours:', error);
    }
  };

  const handleDelete = async () => {
    setShowDeleteDialog(false);
    try {
      if (taskId) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        await deleteMaintenanceTask(taskId);
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('maintenance.deleteError'));
      console.error(error);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t('common.error'), t('maintenance.titleRequired'));
      return;
    }

    const hoursNum = intervalHours.trim() ? parseFloat(intervalHours) : undefined;
    const daysNum = intervalDays.trim() ? parseInt(intervalDays, 10) : undefined;
    const hasHours = hoursNum != null && !isNaN(hoursNum) && hoursNum > 0;
    const hasDays = daysNum != null && !isNaN(daysNum) && daysNum > 0;

    if (!hasHours && !hasDays) {
      Alert.alert(t('common.error'), t('maintenance.intervalRequired'));
      return;
    }

    const serviceHoursNum = parseFloat(lastServiceHours);

    try {
      const now = new Date().toISOString();
      const task: MaintenanceTask = {
        id: isEditing && existingTask ? existingTask.id : generateId(),
        generatorId,
        title: title.trim(),
        intervalHours: hasHours ? hoursNum : undefined,
        intervalDays: hasDays ? daysNum : undefined,
        lastServiceHours: isNaN(serviceHoursNum) ? 0 : serviceHoursNum,
        lastServiceDate,
        notes: notes.trim() || undefined,
        createdAt: isEditing && existingTask ? existingTask.createdAt : now,
        lastModified: now,
        syncStatus: 'pending',
      };

      await saveMaintenanceTask(task);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      Alert.alert(t('common.error'), t('maintenance.saveError'));
      console.error(error);
    }
  };

  const header = (
    <ScreenHeader
      title={isEditing ? t('maintenance.editTitle') : t('maintenance.addTitle')}
      leading="close"
      onLeadingPress={() => navigation.goBack()}
      actions={[
        { key: 'save', label: t('common.save'), icon: 'save', variant: 'done', onPress: handleSave, testID: 'save-maintenance' },
      ]}
      scrollEdge={isIOS}
    />
  );

  const deleteDialog = (
    <DeleteConfirmDialog
      visible={showDeleteDialog}
      title={t('maintenance.deleteTitle')}
      message={t('maintenance.deleteConfirm')}
      onDismiss={() => setShowDeleteDialog(false)}
      onConfirm={handleDelete}
    />
  );

  if (isIOS) {
    const sections: FormSection[] = [
      {
        key: 'task',
        fields: [
          {
            kind: 'text',
            key: 'title',
            label: t('form.task'),
            value: title,
            onChange: setTitle,
            placeholder: t('maintenance.titlePlaceholder'),
            testID: 'input-maintenance-title',
          },
        ],
      },
      {
        key: 'interval',
        title: t('form.interval'),
        footer: t('maintenance.intervalRequired'),
        fields: [
          {
            kind: 'text',
            key: 'hours',
            label: t('form.engineHours'),
            value: intervalHours,
            onChange: setIntervalHours,
            placeholder: t('maintenance.intervalHoursPlaceholder'),
            keyboard: 'decimal',
            suffix: t('common.hoursAbbr'),
            testID: 'input-maintenance-hours',
          },
          {
            kind: 'text',
            key: 'days',
            label: t('form.days'),
            value: intervalDays,
            onChange: setIntervalDays,
            placeholder: t('maintenance.intervalDaysPlaceholder'),
            keyboard: 'number',
            suffix: t('form.daysSuffix'),
          },
        ],
      },
      {
        key: 'lastService',
        title: t('form.lastService'),
        fields: [
          { kind: 'date', key: 'date', label: t('form.date'), value: lastServiceDate, onChange: setLastServiceDate },
          {
            kind: 'text',
            key: 'lastHours',
            label: t('form.engineHours'),
            value: lastServiceHours,
            onChange: setLastServiceHours,
            placeholder: t('maintenance.lastServiceHoursPlaceholder'),
            keyboard: 'decimal',
            suffix: t('common.hoursAbbr'),
          },
        ],
      },
      {
        key: 'notes',
        title: t('form.notes'),
        fields: [{ kind: 'notes', key: 'notes', value: notes, onChange: setNotes, placeholder: t('maintenance.notesPlaceholder') }],
      },
    ];
    if (isEditing) {
      sections.push({
        key: 'delete',
        fields: [
          { kind: 'button', key: 'delete', label: t('maintenance.deleteButton'), destructive: true, onPress: () => setShowDeleteDialog(true) },
        ],
      });
    }
    return (
      <>
        {header}
        <NativeForm sections={sections} />
        {deleteDialog}
      </>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {header}

      <ScrollView contentContainerStyle={[styles.content, contentColumn]}>
        <TextInput
          mode="outlined"
          label={t('maintenance.titleLabel')}
          value={title}
          onChangeText={setTitle}
          placeholder={t('maintenance.titlePlaceholder')}
          left={<TextInput.Icon icon="wrench" />}
          testID="input-maintenance-title"
          style={styles.input}
        />

        <TextInput
          mode="outlined"
          label={t('maintenance.intervalHoursLabel')}
          value={intervalHours}
          onChangeText={setIntervalHours}
          placeholder={t('maintenance.intervalHoursPlaceholder')}
          keyboardType="decimal-pad"
          left={<TextInput.Icon icon="clock-outline" />}
          right={<TextInput.Affix text={t('common.hoursAbbr')} />}
          testID="input-maintenance-hours"
          style={styles.input}
        />

        <TextInput
          mode="outlined"
          label={t('maintenance.intervalDaysLabel')}
          value={intervalDays}
          onChangeText={setIntervalDays}
          placeholder={t('maintenance.intervalDaysPlaceholder')}
          keyboardType="number-pad"
          left={<TextInput.Icon icon="calendar-range" />}
          style={styles.input}
        />

        <Pressable onPress={() => setShowDatePicker(true)}>
          <View pointerEvents="none">
            <TextInput
              mode="outlined"
              label={t('maintenance.lastServiceDateLabel')}
              value={formatDate(lastServiceDate, i18n.language)}
              left={<TextInput.Icon icon="calendar-check" />}
              style={styles.input}
              editable={false}
            />
          </View>
        </Pressable>

        {showDatePicker && (
          <DateTimePicker
            value={parseLocalDate(lastServiceDate)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}

        <TextInput
          mode="outlined"
          label={t('maintenance.lastServiceHoursLabel')}
          value={lastServiceHours}
          onChangeText={setLastServiceHours}
          placeholder={t('maintenance.lastServiceHoursPlaceholder')}
          keyboardType="decimal-pad"
          left={<TextInput.Icon icon="engine" />}
          right={<TextInput.Affix text={t('common.hoursAbbr')} />}
          style={styles.input}
        />

        <TextInput
          mode="outlined"
          label={t('workSession.notesLabel')}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('maintenance.notesPlaceholder')}
          left={<TextInput.Icon icon="note-text" />}
          multiline
          numberOfLines={4}
          style={[styles.input, { marginTop: 8 }]}
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
            {t('maintenance.deleteButton')}
          </Button>
        )}
      </ScrollView>

      {deleteDialog}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 24,
  },
  input: {
    marginBottom: 8,
  },
  deleteButton: {
    marginTop: 16,
    marginBottom: 24,
  },
  deleteButtonContent: {
    paddingVertical: 4,
  },
});
