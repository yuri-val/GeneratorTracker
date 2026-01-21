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
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { Refill } from '../../models/types';
import { saveRefill, getRefills, deleteRefill } from '../../utils/storage';
import { generateId } from '../../utils/calculations';
import { Colors } from '../../constants/colors';

type AddRefillScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AddRefill'>;
  route: RouteProp<RootStackParamList, 'AddRefill'>;
};

export default function AddRefillScreen({ navigation, route }: AddRefillScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const { generatorId, refillId } = route.params;
  const isEditing = !!refillId;

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [existingRefill, setExistingRefill] = useState<Refill | null>(null);

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
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Are you sure you want to delete this refill? This cannot be undone.')
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Delete Refill',
            'Are you sure you want to delete this refill? This cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (confirmed) {
      try {
        if (refillId) {
          await deleteRefill(refillId);
          navigation.goBack();
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to delete refill');
        console.error(error);
      }
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
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save refill');
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
          {isEditing ? 'Edit Refill' : 'Add Refill'}
        </Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: colors.primary, fontWeight: '600' }]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
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
          <Text style={[styles.label, { color: colors.text }]}>Fuel Amount (Liters) *</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            value={amount}
            onChangeText={setAmount}
            placeholder="e.g., 5.5"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
        </View>

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
            placeholder="Add any notes about this refill..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
          />
        </View>

        {isEditing && (
          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: colors.error }]}
            onPress={handleDelete}
          >
            <Text style={styles.deleteButtonText}>Delete Refill</Text>
          </TouchableOpacity>
        )}
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
  deleteButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
