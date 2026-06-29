import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable, Platform } from 'react-native';
import { Appbar, TextInput, HelperText } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../navigation/types';
import { Generator } from '../../models/types';
import { saveGenerator, getGenerators } from '../../utils/storage';
import { generateId, formatDate } from '../../utils/calculations';
import { useAppTheme } from '../../theme/useAppTheme';

type AddGeneratorScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AddGenerator'>;
  route: RouteProp<RootStackParamList, 'AddGenerator'>;
};

export default function AddGeneratorScreen({ navigation, route }: AddGeneratorScreenProps) {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const { generatorId } = route.params || {};
  const isEdit = !!generatorId;

  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [existingGenerator, setExistingGenerator] = useState<Generator | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setPurchaseDate(selectedDate.toISOString().split('T')[0]);
    }
  };

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
      Alert.alert(t('common.error'), t('generator.loadError'));
    }
  };

  const handleSave = async () => {
    setSubmitted(true);
    if (!name.trim()) {
      return;
    }

    try {
      const now = new Date().toISOString();
      const generator: Generator = {
        id: isEdit && existingGenerator ? existingGenerator.id : generateId(),
        name: name.trim(),
        model: model.trim() || undefined,
        purchaseDate,
        createdAt: isEdit && existingGenerator ? existingGenerator.createdAt : now,
        lastModified: now,
        syncStatus: 'pending',
      };

      await saveGenerator(generator);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      Alert.alert(t('common.error'), t('generator.saveError'));
      console.error(error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Action icon="close" onPress={() => navigation.goBack()} />
        <Appbar.Content
          title={isEdit ? t('generator.editTitle') : t('generator.addTitle')}
          titleStyle={styles.headerTitle}
        />
        <Appbar.Action icon="check" onPress={handleSave} testID="save-generator" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          mode="outlined"
          label={t('generator.nameLabel')}
          value={name}
          onChangeText={setName}
          placeholder={t('generator.namePlaceholder')}
          left={<TextInput.Icon icon="engine" />}
          error={submitted && !name.trim()}
          testID="input-generator-name"
          style={styles.input}
        />
        <HelperText type="error" visible={submitted && !name.trim()}>
          {t('generator.nameRequired')}
        </HelperText>

        <TextInput
          mode="outlined"
          label={t('generator.modelLabel')}
          value={model}
          onChangeText={setModel}
          placeholder={t('generator.modelPlaceholder')}
          left={<TextInput.Icon icon="tag" />}
          style={styles.input}
        />

        <Pressable onPress={() => setShowDatePicker(true)}>
          <View pointerEvents="none">
            <TextInput
              mode="outlined"
              label={t('generator.purchaseDateLabel')}
              value={formatDate(purchaseDate, i18n.language)}
              placeholder="YYYY-MM-DD"
              left={<TextInput.Icon icon="calendar" />}
              style={styles.input}
              editable={false}
            />
          </View>
        </Pressable>

        {showDatePicker && (
          <DateTimePicker
            value={new Date(purchaseDate)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}
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
