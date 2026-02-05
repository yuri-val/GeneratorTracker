import {
  MD3DarkTheme,
  MD3LightTheme,
  configureFonts,
} from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

const darkColors = {
  primary: '#FF6B35',
  onPrimary: '#FFFFFF',
  primaryContainer: '#3D1800',
  onPrimaryContainer: '#FFDBCC',

  secondary: '#0a7ea4',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#003549',
  onSecondaryContainer: '#C5E7FF',

  tertiary: '#22C55E',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#003A1A',
  onTertiaryContainer: '#7CFC9A',

  error: '#EF4444',
  onError: '#FFFFFF',
  errorContainer: '#410002',
  onErrorContainer: '#FFDAD6',

  background: '#151718',
  onBackground: '#ECEDEE',
  surface: '#151718',
  onSurface: '#ECEDEE',
  surfaceVariant: '#1e2022',
  onSurfaceVariant: '#9BA1A6',
  surfaceDisabled: 'rgba(236, 237, 238, 0.12)',
  onSurfaceDisabled: 'rgba(236, 237, 238, 0.38)',

  elevation: {
    level0: 'transparent',
    level1: '#1e2022',
    level2: '#252729',
    level3: '#2a2c2e',
    level4: '#2f3133',
    level5: '#343638',
  },

  outline: '#334155',
  outlineVariant: '#252729',

  inverseSurface: '#ECEDEE',
  inverseOnSurface: '#151718',
  inversePrimary: '#C0470A',

  shadow: '#000000',
  scrim: '#000000',
  backdrop: 'rgba(0, 0, 0, 0.5)',
};

const lightColors = {
  primary: '#FF6B35',
  onPrimary: '#FFFFFF',
  primaryContainer: '#FFDBCC',
  onPrimaryContainer: '#3D1800',

  secondary: '#0a7ea4',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#C5E7FF',
  onSecondaryContainer: '#003549',

  tertiary: '#22C55E',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#7CFC9A',
  onTertiaryContainer: '#003A1A',

  error: '#EF4444',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',

  background: '#FFFFFF',
  onBackground: '#11181C',
  surface: '#FFFFFF',
  onSurface: '#11181C',
  surfaceVariant: '#F5F5F5',
  onSurfaceVariant: '#687076',
  surfaceDisabled: 'rgba(17, 24, 28, 0.12)',
  onSurfaceDisabled: 'rgba(17, 24, 28, 0.38)',

  elevation: {
    level0: 'transparent',
    level1: '#F5F5F5',
    level2: '#EEEEEE',
    level3: '#E8E8E8',
    level4: '#E0E0E0',
    level5: '#D8D8D8',
  },

  outline: '#E5E7EB',
  outlineVariant: '#F0F0F0',

  inverseSurface: '#11181C',
  inverseOnSurface: '#ECEDEE',
  inversePrimary: '#FFBA9B',

  shadow: '#000000',
  scrim: '#000000',
  backdrop: 'rgba(0, 0, 0, 0.3)',
};

const fontConfig = {
  displayLarge: { fontFamily: 'System', fontSize: 57, fontWeight: '400' as const, letterSpacing: -0.25, lineHeight: 64 },
  displayMedium: { fontFamily: 'System', fontSize: 45, fontWeight: '400' as const, letterSpacing: 0, lineHeight: 52 },
  displaySmall: { fontFamily: 'System', fontSize: 36, fontWeight: '400' as const, letterSpacing: 0, lineHeight: 44 },
  headlineLarge: { fontFamily: 'System', fontSize: 32, fontWeight: '700' as const, letterSpacing: 0, lineHeight: 40 },
  headlineMedium: { fontFamily: 'System', fontSize: 28, fontWeight: '600' as const, letterSpacing: 0, lineHeight: 36 },
  headlineSmall: { fontFamily: 'System', fontSize: 24, fontWeight: '600' as const, letterSpacing: 0, lineHeight: 32 },
  titleLarge: { fontFamily: 'System', fontSize: 22, fontWeight: '600' as const, letterSpacing: 0, lineHeight: 28 },
  titleMedium: { fontFamily: 'System', fontSize: 16, fontWeight: '600' as const, letterSpacing: 0.15, lineHeight: 24 },
  titleSmall: { fontFamily: 'System', fontSize: 14, fontWeight: '600' as const, letterSpacing: 0.1, lineHeight: 20 },
  bodyLarge: { fontFamily: 'System', fontSize: 16, fontWeight: '400' as const, letterSpacing: 0.5, lineHeight: 24 },
  bodyMedium: { fontFamily: 'System', fontSize: 14, fontWeight: '400' as const, letterSpacing: 0.25, lineHeight: 20 },
  bodySmall: { fontFamily: 'System', fontSize: 12, fontWeight: '400' as const, letterSpacing: 0.4, lineHeight: 16 },
  labelLarge: { fontFamily: 'System', fontSize: 14, fontWeight: '500' as const, letterSpacing: 0.1, lineHeight: 20 },
  labelMedium: { fontFamily: 'System', fontSize: 12, fontWeight: '500' as const, letterSpacing: 0.5, lineHeight: 16 },
  labelSmall: { fontFamily: 'System', fontSize: 11, fontWeight: '500' as const, letterSpacing: 0.5, lineHeight: 16 },
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...darkColors,
  },
  fonts: configureFonts({ config: fontConfig }),
};

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...lightColors,
  },
  fonts: configureFonts({ config: fontConfig }),
};

export const appColors = {
  warning: '#F59E0B',
  success: '#22C55E',
  activeSession: '#22C55E',
  activeSessionDark: '#16A34A',
  fuelOrange: '#FF8C42',
  techBlue: '#06BEE1',
};

export type AppTheme = typeof darkTheme & {
  colors: typeof darkTheme.colors;
};
