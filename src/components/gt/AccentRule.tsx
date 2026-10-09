import React from 'react';
import { View } from 'react-native';

/** Generator identity mark: a short vertical rule in the generator colour. */
export function AccentRule({ color, width = 3, height = 16, opacity = 1 }: { color: string; width?: number; height?: number; opacity?: number }) {
  return <View accessibilityElementsHidden importantForAccessibility="no" style={{ width, height, backgroundColor: color, opacity }} />;
}
