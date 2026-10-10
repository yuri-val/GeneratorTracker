import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AccentRule, GtText, Num, SquareButton } from '../gt';
import { useAppTheme } from '../../theme/useAppTheme';
import { size } from '../../theme/tokens';
import type { FleetItem } from '../../hooks/useFleet';
import { fmtClockTime, fmtDurationWords, fmtLitresValue, fmtNumber, fmtShortDate, litreUnit, NBSP, splitAround } from '../../utils/format';
import { shortStatusText } from '../../utils/maintenanceView';
import { sessionElapsedMs } from '../../services/sessions';

interface RowProps {
  item: FleetItem;
  now: number;
  onOpen: () => void;
  onStart: () => void;
  onStop: () => void;
}

/** "▲ Масло · прострочено 4 год" — shown on Home only when maintenance is not OK. */
function MaintenanceLine({ item, onRunning }: { item: FleetItem; onRunning: boolean }) {
  const { t, i18n } = useTranslation();
  const { gt } = useAppTheme();
  if (!item.maintenance) return null;
  const { task, status } = item.maintenance;
  const due = status.level === 'due';
  // On the light running card (ink) use the dark-theme status colours for contrast.
  const color = onRunning && !gt.dark ? (due ? '#FF8A78' : '#FFC266') : due ? gt.due : gt.soon;
  return (
    <GtText variant="meta" weight="500" color={color} numberOfLines={1} testID={`home-maintenance-${item.generator.id}`}>
      ▲ {task.title} · {shortStatusText(task, status, t, i18n.language)}
    </GtText>
  );
}

/** Running generator: inverted ink card (light) / raised surface with a colour strip (dark). */
export function RunningCard({ item, now, onOpen, onStop }: RowProps) {
  const { t, i18n } = useTranslation();
  const { gt } = useAppTheme();
  const lang = i18n.language;
  const running = item.running!;
  const elapsed = sessionElapsedMs(running, now);
  const [sinceBefore, sinceAfter] = splitAround(t, 'home.since', 'time');
  const openLabel = `${item.generator.name}, ${t('detail.activeSession')}, ${fmtDurationWords(elapsed, lang)}`;
  return (
    <View
      testID={`home-card-${item.generator.id}`}
      style={[styles.runCard, { backgroundColor: gt.runSurface }, gt.dark && { borderTopWidth: 3, borderTopColor: item.color }]}
    >
      <View style={styles.rowBetween}>
        <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={openLabel} style={styles.runOpen} testID={`home-open-${item.generator.id}`}>
          <View style={styles.rowBetween}>
            <View style={styles.nameRow}>
              <AccentRule color={item.color} />
              <GtText variant="cardTitle" color={gt.runText} numberOfLines={1} style={styles.flex}>
                {item.generator.name}
              </GtText>
            </View>
          </View>
          <GtText variant="timerHome" size={gt.dark ? 30 : 28} color={gt.runText} tabular testID={`home-timer-${item.generator.id}`} style={styles.gapTop}>
            {fmtDurationWords(elapsed, lang)}
          </GtText>
          {item.fuel && (
            <GtText variant="meta" color={gt.runMuted} style={styles.gapTop}>
              {t('home.fuelLabel')}{' '}
              {item.fuel.known ? (
                <>
                  ≈{NBSP}<Num color={gt.runText}>{fmtLitresValue(item.fuel.level, lang)}</Num>
                  {NBSP}{litreUnit(lang)} · ~{fmtNumber(item.fuel.hoursLeft, lang)}{NBSP}{t('common.hoursAbbr')}
                </>
              ) : (
                '—'
              )}
            </GtText>
          )}
        </Pressable>
        <View style={styles.runSide}>
          <GtText variant="caption" weight="500" color={gt.running}>
            ● {sinceBefore}<Num>{fmtClockTime(running.startTime, lang)}</Num>{sinceAfter}
          </GtText>
          <SquareButton
            kind="stop"
            glyph="stop"
            layout="stacked"
            height={size.startStop.h}
            label={t('home.stop')}
            accessibilityLabel={t('live.stopNamed', { name: item.generator.name })}
            onPress={onStop}
            testID={`home-stop-${item.generator.id}`}
          />
        </View>
      </View>
      {item.maintenance && (
        <Pressable onPress={onOpen} style={[styles.runMaint, { borderTopColor: gt.runRule }]} accessibilityRole="button">
          <MaintenanceLine item={item} onRunning />
        </Pressable>
      )}
    </View>
  );
}

/** Idle generator: a flat row with an outlined Start button. */
export function IdleRow({ item, onOpen, onStart }: RowProps) {
  const { t, i18n } = useTranslation();
  const { gt } = useAppTheme();
  const lang = i18n.language;
  const last = item.lastSession;
  return (
    <View testID={`home-card-${item.generator.id}`} style={[styles.idleRow, { borderBottomColor: gt.rule }]}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={item.generator.name}
        testID={`home-open-${item.generator.id}`}
        style={({ pressed }) => [styles.flex, styles.idleOpen, pressed && { opacity: 0.6 }]}
      >
        <View style={styles.nameRow}>
          <AccentRule color={item.color} opacity={gt.dark ? 0.6 : 1} />
          <GtText variant="cardTitle" weight={gt.dark ? '500' : '600'} color={gt.idleName} numberOfLines={1} style={styles.flex}>
            {item.generator.name}
          </GtText>
        </View>
        <View style={styles.indent}>
          {last ? (
            <GtText variant="meta" color={gt.dark ? gt.textFaint : gt.textMuted} numberOfLines={1}>
              {t('home.lastSession', { date: fmtShortDate(last.date, lang) })} · ≈{NBSP}
              <Num color={gt.dark ? gt.textFaint : gt.text}>{fmtLitresValue(last.hours * item.lph, lang)}</Num>
              {NBSP}{litreUnit(lang)}
            </GtText>
          ) : item.generator.model ? (
            <GtText variant="meta" color={gt.dark ? gt.textFaint : gt.textMuted} numberOfLines={1}>
              {item.generator.model}
            </GtText>
          ) : null}
          <MaintenanceLine item={item} onRunning={false} />
        </View>
      </Pressable>
      <SquareButton
        kind="start"
        glyph="play"
        layout="stacked"
        height={size.startStop.h}
        label={t('home.start')}
        accessibilityLabel={`${t('home.start')} ${item.generator.name}`}
        onPress={onStart}
        testID={`home-start-${item.generator.id}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  gapTop: { marginTop: 4 },
  runCard: { padding: 16, gap: 10, marginHorizontal: -4 },
  runOpen: { flex: 1, alignSelf: 'stretch', justifyContent: 'center' },
  runSide: { alignItems: 'flex-end', gap: 8 },
  idleOpen: { justifyContent: 'center', alignSelf: 'stretch' },
  runMaint: { borderTopWidth: 1, paddingTop: 10 },
  idleRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1 },
  indent: { marginLeft: 11, marginTop: 2, gap: 2 },
});
