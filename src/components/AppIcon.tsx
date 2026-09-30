import React from 'react';
import { Platform, type ColorValue } from 'react-native';
import { Icon } from 'react-native-paper';
import { SymbolView } from 'expo-symbols';
import { ICONS, type IconName } from '../constants/icons';

interface AppIconProps {
  name: IconName;
  size?: number;
  color?: ColorValue;
}

/** SF Symbol on iOS, Material icon on Android and web. */
export function AppIcon({ name, size = 24, color }: AppIconProps) {
  const icon = ICONS[name];
  if (Platform.OS === 'ios') {
    return <SymbolView name={icon.sf} size={size} tintColor={color} resizeMode="scaleAspectFit" />;
  }
  return <Icon source={icon.mci} size={size} color={color as string | undefined} />;
}
