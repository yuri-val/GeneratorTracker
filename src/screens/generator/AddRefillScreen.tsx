import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable, Platform, TextInput } from 'react-native';
import * as Haptics from 'expo-haptics';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import type { Generator, Refill, WorkSession } from '../../models/types';
import { getGenerators, getRefills, getWorkSessions, deleteRefill } from '../../utils/storage';
import { getCurrentTime, parseLocalDate, toLocalDateString } from '../../utils/calculations';
import { useAppTheme } from '../../theme/useAppTheme';
import { DeleteConfirmDialog } from '../../components/DeleteConfirmDialog';
import { ScreenHeader } from '../../components/ScreenHeader';
import { AppIcon } from '../../components/AppIcon';
import { GtText, SquareButton, fontFor, useSnackbar } from '../../components/gt';
import { contentColumn } from '../../theme/layout';
import { space } from '../../theme/tokens';
import { recordRefill, sessionElapsedMs, startSession, stopForRefill } from '../../services/sessions';
import {
  defaultRefill, estimateFuel, previewRefill, refillPresets, roundLitres, stepperStep, type RefillPreset,
} from '../../utils/fuel';
import { fmtClockTime, fmtLitresValue, fmtNumber, fmtShortDate, litreUnit, NBSP } from '../../utils/format';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AddRefill'>;
  route: RouteProp<RootStackParamList, 'AddRefill'>;
};

const parseAmount = (text: string) => parseFloat(text.replace(',', '.'));

/**
 * Refill sheet (3.0, design 5a / 5f): stepper, presets, "filled to full" calibration and a block
 * while the generator runs ("Stop and refill"). After saving: "Refill saved · Start again".
 */
export default function AddRefillScreen({ navigation, route }: Props) {
  const { gt } = useAppTheme();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const snackbar = useSnackbar();
  const { generatorId, refillId } = route.params;
  const isEditing = !!refillId;

  const [generator, setGenerator] = useState<Generator | null>(null);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [otherRefills, setOtherRefills] = useState<Refill[]>([]);
  const [existing, setExisting] = useState<Refill | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [amountText, setAmountText] = useState('');
  const [markedFull, setMarkedFull] = useState(false);
  const [date, setDate] = useState(toLocalDateString());
  const [time, setTime] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [gens, s, r] = await Promise.all([getGenerators(), getWorkSessions(generatorId), getRefills(generatorId)]);
    setGenerator(gens.find(g => g.id === generatorId) ?? null);
    setSessions(s);
    setOtherRefills(r.filter(x => x.id !== refillId));
    return { gen: gens.find(g => g.id === generatorId) ?? null, s, r };
  }, [generatorId, refillId]);

  // First load: defaults for a new refill, the stored values when editing.
  useEffect(() => {
    load()
      .then(({ gen, s, r }) => {
        if (refillId) {
          const refill = r.find(x => x.id === refillId);
          if (refill) {
            setExisting(refill);
            setAmountText(String(refill.amount));
            setMarkedFull(!!refill.isFull);
            setDate(refill.date);
            setTime(refill.time);
            setNotes(refill.notes ?? '');
          }
        } else if (gen) {
          const others = r;
          const running = s.find(x => x.isActive);
          const est = estimateFuel(gen, s, others, running ? sessionElapsedMs(running) / 3_600_000 : 0);
          const last = [...others].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.amount;
          const def = defaultRefill(est, gen.tankCapacity, last);
          setAmountText(def.litres ? String(def.litres) : '');
          setMarkedFull(def.full);
        }
        setLoaded(true);
      })
      .catch(error => {
        console.error('Error loading refill:', error);
        Alert.alert(t('common.error'), t('refill.loadError'));
      });
  }, [load, refillId, t]);

  const running = !isEditing ? sessions.find(s => s.isActive) ?? null : null;
  const tank = generator?.tankCapacity;
  const estimate = useMemo(
    () => (generator ? estimateFuel(generator, sessions, otherRefills, running ? sessionElapsedMs(running) / 3_600_000 : 0) : null),
    [generator, sessions, otherRefills, running],
  );
  const lastRefill = useMemo(() => [...otherRefills].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.amount, [otherRefills]);
  const amount = parseAmount(amountText);
  const amountValid = !isNaN(amount) && amount > 0;
  const preview = estimate && tank && amountValid ? previewRefill(estimate, tank, amount, markedFull) : null;
  const presets: RefillPreset[] = estimate && tank ? refillPresets(estimate, tank, lastRefill) : [];
  const step = stepperStep(tank);
  const disabled = !!running;
  const tankFull = !isEditing && !!estimate?.known && estimate.free < 0.05;

  const setAmount = (value: number) => setAmountText(String(roundLitres(Math.max(0, value))));
  const applyPreset = (p: RefillPreset) => {
    Haptics.selectionAsync?.();
    if (p.litres !== undefined) setAmount(p.litres);
    if (p.key === 'toFull') setMarkedFull(true);
  };

  const handleStopAndRefill = async () => {
    if (!running) return;
    try {
      const stopped = await stopForRefill(running);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDate(stopped.date);
      setTime(stopped.time);
      await load();
    } catch (error) {
      console.error(error);
      Alert.alert(t('common.error'), t('detail.failedToStopSession'));
    }
  };

  const handleSave = async () => {
    if (!amountValid) {
      Alert.alert(t('common.error'), t('refill.amountRequired'));
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      await recordRefill({
        id: existing?.id,
        generatorId,
        amount: roundLitres(amount),
        date,
        time: time ?? (isEditing ? existing?.time : getCurrentTime()),
        isFull: markedFull || !!preview?.over,
        notes: notes.trim() || undefined,
        createdAt: existing?.createdAt,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
      if (!isEditing) {
        const stillRunning = (await getWorkSessions(generatorId)).some(s => s.isActive);
        snackbar.show({
          message: `✓ ${t('refill.saved')}`,
          actionLabel: stillRunning ? undefined : `▶ ${t('refill.startAgain')}`,
          duration: 6000,
          testID: 'snackbar-refill-saved',
          onAction: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await startSession(generatorId);
          },
        });
      }
    } catch (error) {
      console.error(error);
      Alert.alert(t('common.error'), t('refill.saveError'));
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteDialog(false);
    if (!refillId) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await deleteRefill(refillId);
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert(t('common.error'), t('refill.deleteError'));
    }
  };

  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setShowDatePicker(false);
    if (selected) setDate(toLocalDateString(selected));
  };

  // Disabled form while running: light uses 35 % opacity; dark uses explicit colours (contrast ≥ 4.5:1).
  const formText = disabled && gt.dark ? gt.disabledText : gt.text;
  const formBorder = disabled && gt.dark ? gt.disabledRule : gt.dark ? gt.ruleStrong : gt.text;
  const formOpacity = disabled && !gt.dark ? 0.35 : 1;

  const subtitle =
    tank && estimate
      ? estimate.known
        ? t('refill.sheetSubtitle', { tank: fmtNumber(tank, lang), level: fmtLitresValue(estimate.level, lang), free: fmtLitresValue(estimate.free, lang) })
        : t('refill.levelUnknown', { tank: fmtNumber(tank, lang) })
      : null;

  const isToday = date === toLocalDateString();
  const whenLabel = `${isToday ? t('refill.today') : fmtShortDate(date, lang)}${time ? `, ${fmtClockTime(time, lang)}` : ''}`;

  return (
    <View style={[styles.flex, { backgroundColor: gt.dark ? gt.surface : gt.bg }]}>
      <ScreenHeader
        title={isEditing ? t('refill.editTitle') : t('refill.addTitle')}
        leading="close"
        onLeadingPress={() => navigation.goBack()}
      />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, contentColumn]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {!!subtitle && (
          <GtText variant="meta" color={gt.textMuted} testID="refill-subtitle">
            {generator?.name ? `${generator.name} · ` : ''}
            {subtitle}
          </GtText>
        )}

        {running && (
          <View style={[styles.banner, { borderColor: gt.dangerBorder, backgroundColor: gt.dangerBg }]} testID="refill-running-banner">
            <GtText variant="body" weight="600" color={gt.dangerTitle}>
              ▲ {t('refill.runningTitle')}
            </GtText>
            <GtText variant="meta" color={gt.dangerBody}>
              {t('refill.runningBody')}
            </GtText>
            <SquareButton kind="stop" glyph="stop" label={t('refill.stopAndRefill')} onPress={handleStopAndRefill} testID="stop-and-refill" />
          </View>
        )}

        <View pointerEvents={disabled ? 'none' : 'auto'} style={{ opacity: formOpacity, gap: space.xl }}>
          <View style={[styles.stepper, { borderColor: formBorder }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('refill.stepperDecrease')}
              onPress={() => setAmount((amountValid ? amount : 0) - step)}
              style={({ pressed }) => [styles.stepButton, { borderRightColor: formBorder }, pressed && { backgroundColor: gt.pressed }]}
              testID="refill-minus"
            >
              <GtText variant="sheetTitle" weight="400" color={formText}>
                −
              </GtText>
            </Pressable>
            <View style={styles.stepValue}>
              <TextInput
                value={amountText.replace('.', lang === 'uk' ? ',' : '.')}
                onChangeText={v => setAmountText(v.replace(',', '.'))}
                keyboardType="decimal-pad"
                selectTextOnFocus
                accessibilityLabel={t('refill.amountLabel')}
                testID="input-refill-amount"
                style={[styles.stepInput, { color: formText, fontFamily: fontFor('500', true) }]}
                placeholder="0"
                placeholderTextColor={gt.textFaint}
              />
              <GtText variant="body" color={disabled && gt.dark ? gt.disabledText : gt.textMuted}>
                {litreUnit(lang)}
              </GtText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('refill.stepperIncrease')}
              onPress={() => setAmount((amountValid ? amount : 0) + step)}
              style={({ pressed }) => [styles.stepButton, { borderLeftColor: formBorder, borderLeftWidth: 1.5, borderRightWidth: 0 }, pressed && { backgroundColor: gt.pressed }]}
              testID="refill-plus"
            >
              <GtText variant="sheetTitle" weight="400" color={formText}>
                +
              </GtText>
            </Pressable>
          </View>

          {disabled && gt.dark && (
            <GtText variant="caption" color={gt.textFaint}>
              {t('refill.formDisabledHint')}
            </GtText>
          )}

          {!disabled && presets.length > 0 && (
            <View style={styles.presets}>
              {presets.map(p => {
                const label =
                  p.key === 'toFull' ? t('refill.presetToFull') : p.key === 'asLastTime' ? t('refill.presetAsLastTime') : t('refill.fixedPreset', { litres: p.litres });
                return (
                  <Pressable
                    key={p.key}
                    disabled={!p.enabled}
                    onPress={() => applyPreset(p)}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !p.enabled }}
                    testID={`refill-preset-${p.key}`}
                    style={({ pressed }) => [
                      styles.preset,
                      { borderColor: p.enabled ? (gt.dark ? gt.ruleStrong : gt.rule) : gt.disabledRule, borderStyle: p.enabled ? 'solid' : 'dashed' },
                      gt.dark && p.enabled && { backgroundColor: gt.raised },
                      pressed && { backgroundColor: gt.pressed },
                    ]}
                  >
                    <GtText variant="caption" weight="500" color={p.enabled ? gt.text : gt.textFaint} numberOfLines={2}>
                      {label}
                    </GtText>
                    {p.enabled ? (
                      p.litres !== undefined && (
                        <GtText variant="meta" mono color={gt.textMuted}>
                          {fmtLitresValue(p.litres, lang)}{NBSP}{litreUnit(lang)}
                        </GtText>
                      )
                    ) : (
                      <GtText variant="caption" color={gt.textFaint}>
                        {t('refill.presetTooBig')}
                      </GtText>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}

          {!disabled && !!tank && (
            <Pressable
              onPress={() => setMarkedFull(v => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: markedFull }}
              aria-checked={markedFull}
              style={styles.checkRow}
              testID="refill-marked-full"
            >
              <View style={[styles.checkbox, { borderColor: gt.text, backgroundColor: markedFull ? gt.text : 'transparent' }]}>
                {markedFull && <AppIcon name="check" size={16} color={gt.bg} />}
              </View>
              <View style={styles.flex}>
                <GtText variant="body" weight="500">
                  {t('refill.markedFull')}
                </GtText>
                <GtText variant="caption" color={gt.textMuted}>
                  {t('refill.markedFullHint', { tank: fmtNumber(tank, lang) })}
                </GtText>
              </View>
            </Pressable>
          )}

          {!disabled && preview && (preview.calibrate || preview.over) && (
            <View style={[styles.message, { backgroundColor: gt.warnBg }]} testID="refill-calibration">
              <GtText variant="caption" color={gt.warnText}>
                {preview.calibrate
                  ? t('refill.calibrate', { diff: `${preview.correction > 0 ? '+' : '−'}${fmtLitresValue(Math.abs(preview.correction), lang)}` })
                  : t('refill.overFree', { free: fmtLitresValue(estimate!.free, lang) })}
              </GtText>
            </View>
          )}

          {!disabled && (
            <Pressable onPress={() => setShowDatePicker(v => !v)} accessibilityRole="button" testID="refill-date">
              <GtText variant="meta" color={gt.textMuted}>
                {preview && preview.after !== null && tank
                  ? `${t('refill.after', { after: fmtLitresValue(preview.after, lang), tank: fmtNumber(tank, lang) })} · `
                  : null}
                <GtText variant="meta" weight="500" color={gt.text} style={styles.underline}>
                  {whenLabel}
                </GtText>
              </GtText>
            </Pressable>
          )}

          {showDatePicker && !disabled && (
            <DateTimePicker
              value={parseLocalDate(date)}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              maximumDate={new Date()}
              onChange={onDateChange}
            />
          )}

          {!disabled && (
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder={t('refill.notesPlaceholder')}
              placeholderTextColor={gt.textFaint}
              multiline
              style={[styles.notes, { borderColor: gt.dark ? gt.ruleStrong : gt.rule, color: gt.text, fontFamily: fontFor('400') }]}
              testID="input-refill-notes"
            />
          )}

          {!disabled &&
            (tankFull ? (
              <SquareButton kind="outline" label={t('refill.tankFull')} disabled height={56} testID="save-refill" />
            ) : (
              <SquareButton
                kind="primary"
                height={56}
                label={amountValid ? t('refill.saveAmount', { litres: fmtLitresValue(amount, lang) }) : t('common.save')}
                onPress={handleSave}
                disabled={!loaded || saving}
                testID="save-refill"
              />
            ))}

          {isEditing && (
            <SquareButton kind="outline" label={t('refill.deleteButton')} onPress={() => setShowDeleteDialog(true)} testID="delete-refill" />
          )}
        </View>
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
  flex: { flex: 1 },
  content: { paddingHorizontal: space.screenX, paddingTop: 18, paddingBottom: 32, gap: space.xl },
  banner: { borderWidth: 1.5, padding: 14, gap: 8 },
  stepper: { height: 66, borderWidth: 1.5, flexDirection: 'row' },
  stepButton: { width: 56, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1.5 },
  stepValue: { flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4, paddingTop: 10 },
  stepInput: { fontSize: 36, minWidth: 60, textAlign: 'center', padding: 0 },
  presets: { flexDirection: 'row', gap: 6 },
  preset: { flex: 1, minHeight: 52, borderWidth: 1, padding: 8, gap: 2, justifyContent: 'center' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { width: 22, height: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  message: { padding: 10 },
  underline: { textDecorationLine: 'underline' },
  notes: { borderWidth: 1, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, textAlignVertical: 'top' },
});
