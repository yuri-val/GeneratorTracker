import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GtText } from './GtText';
import { useAppTheme } from '../../theme/useAppTheme';

/**
 * Tab-root header of the 3.0 design on Android/web (iOS uses the native large title instead):
 * a muted summary line, the 30/700 title, optional trailing controls and the 1.5 px ink rule.
 */
export function PageHeader({ title, summary, trailing, summaryTestID }: { title: string; summary?: string; trailing?: React.ReactNode; summaryTestID?: string }) {
  const { gt } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
      <View style={styles.row}>
        <View style={styles.flex}>
          {!!summary && (
            <GtText variant="meta" color={gt.textMuted} testID={summaryTestID}>
              {summary}
            </GtText>
          )}
          <GtText variant="largeTitle" accessibilityRole="header">
            {title}
          </GtText>
        </View>
        {trailing}
      </View>
      <View style={[styles.rule, { backgroundColor: gt.ruleStrong }]} />
    </View>
  );
}

/**
 * Android/web: tab roots draw edge-to-edge, so scrolled content would show through the transparent
 * status bar. This page-coloured strip covers the top inset (nothing when there is no inset).
 */
export function StatusBarScrim() {
  const { gt } = useAppTheme();
  const { top } = useSafeAreaInsets();
  if (top === 0) return null;
  return <View pointerEvents="none" style={[styles.scrim, { height: top, backgroundColor: gt.bg }]} />;
}

/** iOS counterpart under the native large title: the summary line and the ink rule. */
export function PageSummary({ summary, testID }: { summary: string; testID?: string }) {
  const { gt } = useAppTheme();
  return (
    <View style={styles.iosSummary}>
      <GtText variant="meta" color={gt.textMuted} testID={testID}>
        {summary}
      </GtText>
      <View style={[styles.rule, { backgroundColor: gt.ruleStrong }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: 14, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  rule: { height: 1.5 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0 },
  iosSummary: { paddingTop: 4, gap: 10, marginBottom: 6 },
});
