import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Appbar, TextInput, HelperText } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { Generator } from '../../models/types';
import { saveGenerator, getGenerators } from '../../utils/storage';
import { generateId } from '../../utils/calculations';
import { useAppTheme } from '../../theme/useAppTheme';

type AddGeneratorScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AddGenerator'>;
  route: RouteProp<RootStackParamList, 'AddGenerator'>;
};

export default function AddGeneratorScreen({ navigation, route }: AddGeneratorScreenProps) {
  const theme = useAppTheme();
  const { generatorId } = route.params || {};
  const isEdit = !!generatorId;

  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [existingGenerator, setExistingGenerator] = useState<Generator | null>(null);
  const [submitted, setSubmitted] = useState(false);

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
    setSubmitted(true);
    if (!name.trim()) {
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save generator');
      console.error(error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Action icon="close" onPress={() => navigation.goBack()} />
        <Appbar.Content
          title={isEdit ? 'Edit Generator' : 'New Generator'}
          titleStyle={styles.headerTitle}
        />
        <Appbar.Action icon="check" onPress={handleSave} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          mode="outlined"
          label="Generator Name *"
          value={name}
          onChangeText={setName}
          placeholder="e.g., Honda EU2200i"
          left={<TextInput.Icon icon="engine" />}
          error={submitted && !name.trim()}
          style={styles.input}
        />
        <HelperText type="error" visible={submitted && !name.trim()}>
          Name is required
        </HelperText>

        <TextInput
          mode="outlined"
          label="Model (Optional)"
          value={model}
          onChangeText={setModel}
          placeholder="e.g., EU2200i Companion"
          left={<TextInput.Icon icon="tag" />}
          style={styles.input}
        />

        <TextInput
          mode="outlined"
          label="Purchase Date"
          value={purchaseDate}
          onChangeText={setPurchaseDate}
          placeholder="YYYY-MM-DD"
          left={<TextInput.Icon icon="calendar" />}
          style={styles.input}
        />
        <HelperText type="info" visible>
          Format: YYYY-MM-DD (e.g., 2024-01-15)
        </HelperText>
      </ScrollView>
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
});
