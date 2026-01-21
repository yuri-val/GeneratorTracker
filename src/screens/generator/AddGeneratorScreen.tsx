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
import { Generator } from '../../models/types';
import { saveGenerator, getGenerators } from '../../utils/storage';
import { generateId } from '../../utils/calculations';
import { Colors } from '../../constants/colors';

type AddGeneratorScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AddGenerator'>;
  route: RouteProp<RootStackParamList, 'AddGenerator'>;
};

export default function AddGeneratorScreen({ navigation, route }: AddGeneratorScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const { generatorId } = route.params || {};
  const isEdit = !!generatorId;

  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [existingGenerator, setExistingGenerator] = useState<Generator | null>(null);

  useEffect(() => {
    if (generatorId) {
      loadGenerator();
    }
  }, [generatorId]);

  const loadGenerator = async () => {
    try {
      const generators = await getGenerators();
      const gen = generators.find(g => g.id === generatorId);
      if (gen) {
        setExistingGenerator(gen);
        setName(gen.name);
        setModel(gen.model || '');
        setPurchaseDate(gen.purchaseDate);
      }
    } catch (error) {
      console.error('Error loading generator:', error);
      Alert.alert('Error', 'Failed to load generator');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a generator name');
      return;
    }

    try {
      const generator: Generator = {
        id: isEdit && existingGenerator ? existingGenerator.id : generateId(),
        name: name.trim(),
        model: model.trim() || undefined,
        purchaseDate,
        createdAt: isEdit && existingGenerator ? existingGenerator.createdAt : new Date().toISOString(),
      };

      await saveGenerator(generator);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save generator');
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
          {isEdit ? 'Edit Generator' : 'Add Generator'}
        </Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, { color: colors.primary, fontWeight: '600' }]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Name *</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Honda EU2200i"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Model (Optional)</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            value={model}
            onChangeText={setModel}
            placeholder="e.g., EU2200i Companion"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Purchase Date</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            value={purchaseDate}
            onChangeText={setPurchaseDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Format: YYYY-MM-DD (e.g., 2024-01-15)
          </Text>
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
  hint: {
    fontSize: 13,
    marginTop: 4,
  },
});
