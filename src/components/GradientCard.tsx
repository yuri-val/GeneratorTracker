import React from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientCardProps {
  colors: [string, string, ...string[]];
  children: React.ReactNode;
  style?: ViewStyle;
}

export function GradientCard({ colors, children, style }: GradientCardProps) {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    margin: 16,
  },
});
