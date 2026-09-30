import React from 'react';
import { View, Pressable, StyleSheet, Text, type ColorValue } from 'react-native';
import { AppIcon } from './AppIcon';
import type { IconName } from '../constants/icons';
import { useAppTheme } from '../theme/useAppTheme';
import { surfaces, textColors } from '../theme/platform';

interface GroupedListRowProps {
  title: string;
  subtitle?: string;
  /** Second secondary line (e.g. notes). */
  detail?: string;
  icon: IconName;
  iconColor: string;
  /** Trailing value text (e.g. "2.5h"). */
  value?: string;
  valueColor?: ColorValue;
  /** Trailing element instead of the value (e.g. a status badge). */
  accessory?: React.ReactNode;
  first: boolean;
  last: boolean;
  onPress: () => void;
  testID?: string;
}

/**
 * An iOS inset-grouped table row (UITableView.Style.insetGrouped): rounded group corners,
 * a tinted icon tile, system label colours, a hairline separator inset past the icon
 * and a disclosure chevron.
 */
export function GroupedListRow({
  title,
  subtitle,
  detail,
  icon,
  iconColor,
  value,
  valueColor,
  accessory,
  first,
  last,
  onPress,
  testID,
}: GroupedListRowProps) {
  const theme = useAppTheme();
  const surface = surfaces(theme);
  const text = textColors(theme);

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: surface.card },
        first && styles.first,
        last && styles.last,
        pressed && { opacity: 0.6 },
      ]}
    >
      <View style={[styles.iconTile, { backgroundColor: iconColor + '26' }]}>
        <AppIcon name={icon} size={17} color={iconColor} />
      </View>
      <View style={[styles.body, !last && { borderBottomColor: surface.separator, borderBottomWidth: StyleSheet.hairlineWidth }]}>
        <View style={styles.texts}>
          <Text style={[styles.title, { color: text.primary }]} numberOfLines={1}>
            {title}
          </Text>
          {!!subtitle && (
            <Text style={[styles.subtitle, { color: text.secondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
          {!!detail && (
            <Text style={[styles.subtitle, styles.detail, { color: text.secondary }]} numberOfLines={2}>
              {detail}
            </Text>
          )}
        </View>
        {accessory}
        {!!value && <Text style={[styles.value, { color: valueColor ?? text.secondary }]}>{value}</Text>}
        <AppIcon name="chevron" size={13} color={theme.colors.outline} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingLeft: 16,
  },
  first: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 4,
  },
  last: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingBottom: 4,
  },
  iconTile: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 60,
    paddingVertical: 10,
    paddingRight: 16,
  },
  texts: {
    flex: 1,
  },
  title: {
    fontSize: 17,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 2,
  },
  detail: {
    fontStyle: 'italic',
  },
  value: {
    fontSize: 17,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
