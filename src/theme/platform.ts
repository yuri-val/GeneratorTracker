import { Platform, PlatformColor, type ColorValue } from 'react-native';
import type { AppTheme } from './index';

export const isIOS = Platform.OS === 'ios';

/**
 * Screen and card surfaces native to each platform: iOS system grouped colours
 * (follow light/dark and increased-contrast automatically), Material 3 surfaces elsewhere.
 */
export const surfaces = (theme: AppTheme): { screen: ColorValue; card: ColorValue; separator: ColorValue } =>
  isIOS
    ? {
        screen: PlatformColor('systemGroupedBackground'),
        card: PlatformColor('secondarySystemGroupedBackground'),
        separator: PlatformColor('separator'),
      }
    : {
        screen: theme.colors.background,
        card: theme.colors.elevation.level1,
        separator: theme.colors.outlineVariant,
      };

/** Text colours: iOS semantic label colours, Material on-surface colours elsewhere. */
export const textColors = (theme: AppTheme): { primary: ColorValue; secondary: ColorValue } =>
  isIOS
    ? { primary: PlatformColor('label'), secondary: PlatformColor('secondaryLabel') }
    : { primary: theme.colors.onSurface, secondary: theme.colors.onSurfaceVariant };
