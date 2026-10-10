import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { GtText } from './GtText';
import { AccentRule } from './AccentRule';
import { useAppTheme } from '../../theme/useAppTheme';

export interface FilterOption {
  key: string;
  label: string;
  /** Generator identity colour shown as an accent rule. */
  color?: string;
}

/** Square, single-select filter (3.0): selected = ink fill, others = hairline outline. */
export function FilterChips({ options, value, onChange, accessibilityLabel }: { options: FilterOption[]; value: string; onChange: (key: string) => void; accessibilityLabel?: string }) {
  const { gt } = useAppTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityLabel={accessibilityLabel}>
      {options.map(o => {
        const active = o.key === value;
        const fg = active ? (gt.dark ? '#000000' : gt.bg) : gt.text;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            aria-selected={active}
            accessibilityLabel={o.label}
            testID={`filter-${o.key}`}
            style={({ pressed }) => [
              styles.chip,
              active
                ? { backgroundColor: gt.text, borderColor: gt.text }
                : { borderColor: gt.dark ? gt.ruleStrong : gt.rule, backgroundColor: pressed ? gt.pressed : 'transparent' },
            ]}
          >
            {o.color && (
              <View style={{ opacity: active ? 1 : 0.9 }}>
                <AccentRule color={o.color} height={14} />
              </View>
            )}
            <GtText variant="rowTitle" weight={active ? '600' : '500'} color={fg} numberOfLines={1}>
              {o.label}
            </GtText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 6, paddingVertical: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 14, borderWidth: 1 },
});
