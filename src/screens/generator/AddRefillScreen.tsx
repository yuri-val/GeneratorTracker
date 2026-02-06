import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable, Platform } from 'react-native';
import { Appbar, TextInput, HelperText, Button } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { Refill } from '../../models/types';
import { saveRefill, getRefills, deleteRefill } from '../../utils/storage';
import { generateId, formatDate } from '../../utils/calculations';
import { useAppTheme } from '../../theme/useAppTheme';
import { DeleteConfirmDialog } from '../../components/DeleteConfirmDialog';

type AddRefillScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AddRefill'>;
  route: RouteProp<RootStackParamList, 'AddRefill'>;
};

export default function AddRefillScreen({ navigation, route }: AddRefillScreenProps) {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const { generatorId, refillId } = route.params;
  const isEditing = !!refillId;

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [existingRefill, setExistingRefill] = useState<Refill | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  useEffect(() => {
    if (refillId) {
      loadRefill();
    }
  }, [refillId]);

  const loadRefill = async () => {
    try {
      const refills = await getRefills(generatorId);
      const refill = refills.find(r => r.id === refillId);
      if (refill) {
        setExistingRefill(refill);
        setDate(refill.date);
        setAmount(refill.amount.toString());
        setNotes(refill.notes || '');
      }
    } catch (error) {
      console.error('Error loading refill:', error);
      Alert.alert(t('common.error'), t('refill.loadError'));
    }
  };

  const handleDelete = async () => {
    setShowDeleteDialog(false);
    try {
      if (refillId) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        await deleteRefill(refillId);
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('refill.deleteError'));
      console.error(error);
    }
  };

  const handleSave = async () => {
    if (!date.trim()) {
      Alert.alert(t('common.error'), t('refill.dateRequired'));
      return;
    }

    const amountNum = parseFloat(amount);
    if (!amount.trim() || isNaN(amountNum) || amountNum <= 0) {
      Alert.alert(t('common.error'), t('refill.amountRequired'));
      return;
    }

    try {
      const now = new Date().toISOString();
      const refill: Refill = {
        id: isEditing && existingRefill ? existingRefill.id : generateId(),
        generatorId,
        date,
        amount: amountNum,
        notes: notes.trim() || undefined,
        createdAt: isEditing && existingRefill ? existingRefill.createdAt : now,
        lastModified: now,
        syncStatus: 'pending',
      };

      await saveRefill(refill);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      Alert.alert(t('common.error'), t('refill.saveError'));
      console.error(error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Action icon="close" onPress={() => navigation.goBack()} />
        <Appbar.Content
          title={isEditing ? t('refill.editTitle') : t('refill.addTitle')}
          titleStyle={styles.headerTitle}
        />
        <Appbar.Action icon="check" onPress={handleSave} />
      </Appbar.Header>

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

        {showDatePicker && (
          <DateTimePicker
            value={new Date(date)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}

        <TextInput
          mode="outlined"
          label={t('refill.amountLabel')}
          value={amount}
          onChangeText={setAmount}
          placeholder={t('refill.amountPlaceholder')}
          keyboardType="decimal-pad"
          left={<TextInput.Icon icon="fuel" />}
          right={<TextInput.Affix text={t('common.litersAbbr')} />}
          style={styles.input}
        />

        <TextInput
          mode="outlined"
          label={t('workSession.notesLabel')}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('refill.notesPlaceholder')}
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
            {t('refill.deleteButton')}
          </Button>
        )}
      </ScrollView>

      <DeleteConfirmDialog
        visible={showDeleteDialog}
        title={t('refill.deleteTitle')}
        message={t('refill.deleteConfirm')}
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
  deleteButton: {
    marginTop: 16,
    marginBottom: 24,
  },
  deleteButtonContent: {
    paddingVertical: 4,
  },
});
