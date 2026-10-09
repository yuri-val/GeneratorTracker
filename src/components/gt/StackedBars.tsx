import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GtText } from './GtText';
import { useAppTheme } from '../../theme/useAppTheme';
import { niceMax, type MonthBucket } from '../../utils/analytics';
import { fmtNumber } from '../../utils/format';

interface Props {
  months: MonthBucket[];
  colorOf: (generatorId: string) => string;
  lang: string;
  /** Spoken unit for screen readers, e.g. "год" / "л". */
  unit: string;
  height?: number;
  testID?: string;
  monthValueLabel: (month: string, value: string) => string;
}

/**
 * Square stacked bars (3.0): one column per month, one segment per generator in its identity colour,
 * the month total in mono above the column, a 1.5 px ink baseline. Drawn with Views — no rounded
 * chart-library bars, and it follows the theme and font automatically.
 */
export function StackedBars({ months, colorOf, lang, unit, height = 150, testID, monthValueLabel }: Props) {
  const { gt } = useAppTheme();
  const max = niceMax(Math.max(0, ...months.map(m => m.total)));
  const digits = max < 10 ? 1 : 0;
  return (
    <View testID={testID}>
      <View style={[styles.plot, { height: height + 20 }]}>
        {/* Half-way guide */}
        <View style={[styles.guide, { bottom: height / 2, borderColor: gt.rule }]} />
        <GtText variant="caption" mono color={gt.textFaint} style={[styles.axis, { bottom: height / 2 + 2 }]}>
          {fmtNumber(max / 2, lang, digits)}
        </GtText>
        {months.map(m => (
          <View
            key={m.key}
            style={styles.column}
            accessible
            accessibilityLabel={monthValueLabel(m.label, `${fmtNumber(m.total, lang)} ${unit}`)}
          >
            {m.total > 0 && (
              <GtText variant="caption" mono weight="500" color={gt.text} style={styles.total} numberOfLines={1}>
                {fmtNumber(m.total, lang, m.total >= 100 ? 0 : 1)}
              </GtText>
            )}
            <View style={[styles.bar, { height: (m.total / max) * height }]}>
              {[...m.segments].reverse().map(s => (
                <View key={s.generatorId} style={{ height: `${(s.value / m.total) * 100}%`, backgroundColor: colorOf(s.generatorId) }} />
              ))}
            </View>
          </View>
        ))}
      </View>
      <View style={[styles.baseline, { backgroundColor: gt.ruleStrong }]} />
      <View style={styles.labels}>
        {months.map(m => (
          <GtText key={m.key} variant="caption" color={gt.textMuted} style={styles.label} numberOfLines={1}>
            {m.label}
          </GtText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  column: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  total: { marginBottom: 4 },
  bar: { width: '100%', maxWidth: 34, overflow: 'hidden' },
  guide: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed' },
  axis: { position: 'absolute', left: 0 },
  baseline: { height: 1.5 },
  labels: { flexDirection: 'row', gap: 10, marginTop: 6 },
  label: { flex: 1, textAlign: 'center' },
});
