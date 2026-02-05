import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Appbar, TextInput, HelperText, Button } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { Refill } from '../../models/types';
import { saveRefill, getRefills, deleteRefill } from '../../utils/storage';
import { generateId } from '../../utils/calculations';
import { useAppTheme } from '../../theme/useAppTheme';
import { DeleteConfirmDialog } from '../../components/DeleteConfirmDialog';

type AddRefillScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AddRefill'>;
  route: RouteProp<RootStackParamList, 'AddRefill'>;
};

export default function AddRefillScreen({ navigation, route }: AddRefillScreenProps) {
  const theme = useAppTheme();
  const { generatorId, refillId } = route.params;
  const isEditing = !!refillId;

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [existingRefill, setExistingRefill] = useState<Refill | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
      Alert.alert('Error', 'Failed to load refill');
    }
  };

  const handleDelete = async () => {
    setShowDeleteDialog(false);
    try {
      if (refillId) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        await deleteRefill(refillId);
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete refill');
      console.error(error);
    }
  };

  const handleSave = async () => {
    if (!date.trim()) {
      Alert.alert('Error', 'Please enter a date');
      return;
    }

    const amountNum = parseFloat(amount);
    if (!amount.trim() || isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid fuel amount');
      return;
    }

    try {
      const refill: Refill = {
        id: isEditing && existingRefill ? existingRefill.id : generateId(),
        generatorId,
        date,
        amount: amountNum,
        notes: notes.trim() || undefined,
        createdAt: isEditing && existingRefill ? existingRefill.createdAt : new Date().toISOString(),
      };

      await saveRefill(refill);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save refill');
      console.error(error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Action icon="close" onPress={() => navigation.goBack()} />
        <Appbar.Content
          title={isEditing ? 'Edit Refill' : 'Add Refill'}
          titleStyle={styles.headerTitle}
        />
        <Appbar.Action icon="check" onPress={handleSave} />
      </Appbar.Header>

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
          label="Fuel Amount *"
          value={amount}
          onChangeText={setAmount}
          placeholder="e.g., 5.5"
          keyboardType="decimal-pad"
          left={<TextInput.Icon icon="fuel" />}
          right={<TextInput.Affix text="L" />}
          style={styles.input}
        />

        <TextInput
          mode="outlined"
          label="Notes (Optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes about this refill..."
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
            Delete Refill
          </Button>
        )}
      </ScrollView>

      <DeleteConfirmDialog
        visible={showDeleteDialog}
        title="Delete Refill"
        message="Are you sure you want to delete this refill? This cannot be undone."
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
