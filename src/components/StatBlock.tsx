import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useAppTheme } from '../theme/useAppTheme';

interface StatBlockProps {
  value: string;
  label: string;
  icon?: string;
  color?: string;
}

export function StatBlock({ value, label, icon, color }: StatBlockProps) {
  const theme = useAppTheme();
  const displayColor = color || theme.colors.primary;

  return (
    <View style={styles.container}>
      {icon && <Icon source={icon} size={20} color={displayColor} />}
      <Text variant="headlineSmall" style={[styles.value, { color: displayColor }]}>
        {value}
      </Text>
      <Text variant="labelSmall" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
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
