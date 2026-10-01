import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '../theme/useAppTheme';
import { AppIcon } from './AppIcon';
import type { IconName } from '../constants/icons';
import { textColors } from '../theme/platform';

interface StatBlockProps {
  value: string;
  label: string;
  icon?: IconName;
  color?: string;
}

export function StatBlock({ value, label, icon, color }: StatBlockProps) {
  const theme = useAppTheme();
  const displayColor = color || theme.colors.primary;

  return (
    <View style={styles.container}>
      {icon && <AppIcon name={icon} size={20} color={displayColor} />}
      <Text variant="headlineSmall" style={[styles.value, { color: displayColor }]}>
        {value}
      </Text>
      <Text variant="labelSmall" style={[styles.label, { color: textColors(theme).secondary as string }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  value: {
    fontWeight: '700',
  },
  label: {
    textTransform: 'uppercase',
  },
});
