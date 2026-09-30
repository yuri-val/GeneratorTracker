import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable, Platform } from 'react-native';
import { TextInput, HelperText } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../navigation/types';
import { Generator } from '../../models/types';
import { saveGenerator, getGenerators } from '../../utils/storage';
import { generateId, formatDate, toLocalDateString, parseLocalDate } from '../../utils/calculations';
import { useAppTheme } from '../../theme/useAppTheme';
import { ScreenHeader } from '../../components/ScreenHeader';
import { NativeForm } from '../../components/form/NativeForm';
import { isIOS } from '../../theme/platform';

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
  const [purchaseDate, setPurchaseDate] = useState(toLocalDateString());
  const [existingGenerator, setExistingGenerator] = useState<Generator | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setPurchaseDate(toLocalDateString(selectedDate));
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

  const header = (
    <ScreenHeader
      title={isEdit ? t('generator.editTitle') : t('generator.addTitle')}
      leading="close"
      onLeadingPress={() => navigation.goBack()}
      actions={[
        { key: 'save', label: t('common.save'), icon: 'save', variant: 'done', onPress: handleSave, testID: 'save-generator' },
      ]}
      scrollEdge={isIOS}
    />
  );

  if (isIOS) {
    return (
      <>
        {header}
        <NativeForm
          sections={[
            {
              key: 'generator',
              error: submitted && !name.trim() ? t('generator.nameRequired') : undefined,
              fields: [
                {
                  kind: 'text',
                  key: 'name',
                  label: t('form.name'),
                  value: name,
                  onChange: setName,
                  placeholder: t('form.required'),
                  testID: 'input-generator-name',
                },
                {
                  kind: 'text',
                  key: 'model',
                  label: t('form.model'),
                  value: model,
                  onChange: setModel,
                  placeholder: t('form.optional'),
                  testID: 'input-generator-model',
                },
                { kind: 'date', key: 'purchaseDate', label: t('form.purchaseDate'), value: purchaseDate, onChange: setPurchaseDate },
              ],
            },
          ]}
        />
      </>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {header}

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
          testID="input-generator-model"
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
            value={parseLocalDate(purchaseDate)}
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
  content: {
    padding: 16,
    paddingTop: 24,
  },
  input: {
    marginBottom: 4,
  },
});
