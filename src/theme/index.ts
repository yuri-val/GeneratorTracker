import {
  MD3DarkTheme,
  MD3LightTheme,
  configureFonts,
} from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

import { FONT, gtDark, gtLight, palette, type GtColors } from './tokens';

// 3.0 (design 5a / 5d): warm paper light theme, true-black OLED dark theme, ink as the primary
// colour, red only for Stop / destructive, square corners. Brand orange stays in the app icon.
const L = palette.light;
const D = palette.dark;

const darkColors = {
  primary: D.text,
  onPrimary: '#000000',
  primaryContainer: D.surface3,
  onPrimaryContainer: D.text,

  secondary: '#5BB8D9',
  onSecondary: '#000000',
  secondaryContainer: '#0F2A33',
  onSecondaryContainer: '#C5E7FF',

  tertiary: palette.status.running.dark,
  onTertiary: '#000000',
  tertiaryContainer: '#12301A',
  onTertiaryContainer: '#B9F0C5',

  error: palette.status.dangerBorder.dark,
  onError: '#FFFFFF',
  errorContainer: palette.status.dangerBg.dark,
  onErrorContainer: palette.status.dangerBody.dark,

  background: D.bg,
  onBackground: D.text,
  surface: D.bg,
  onSurface: D.text,
  surfaceVariant: D.surface1,
  onSurfaceVariant: D.textMuted,
  surfaceDisabled: 'rgba(245, 242, 234, 0.12)',
  onSurfaceDisabled: D.textFaint,

  elevation: {
    level0: 'transparent',
    level1: D.surface1,
    level2: D.surface2,
    level3: D.surface3,
    level4: D.surface3,
    level5: D.surface4,
  },

  outline: D.ruleStrong,
  outlineVariant: D.rule,

  inverseSurface: D.text,
  inverseOnSurface: '#000000',
  inversePrimary: L.ink,

  shadow: '#000000',
  scrim: '#000000',
  backdrop: 'rgba(0, 0, 0, 0.6)',
};

const lightColors = {
  primary: L.ink,
  onPrimary: L.bg,
  primaryContainer: L.pressed,
  onPrimaryContainer: L.ink,

  secondary: '#0a7ea4',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#D9ECF3',
  onSecondaryContainer: '#003549',

  tertiary: palette.status.running.onLight,
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#DCEFE0',
  onTertiaryContainer: '#0E3D1B',

  error: palette.status.due.light,
  onError: '#FFFFFF',
  errorContainer: palette.status.dangerBg.light,
  onErrorContainer: palette.status.dangerBody.light,

  background: L.bg,
  onBackground: L.ink,
  surface: L.bg,
  onSurface: L.ink,
  surfaceVariant: '#ECE9E2',
  onSurfaceVariant: L.inkMuted,
  surfaceDisabled: 'rgba(27, 26, 23, 0.12)',
  onSurfaceDisabled: L.inkFaint,

  elevation: {
    level0: 'transparent',
    level1: '#EEEBE5',
    level2: L.pressed,
    level3: '#E2DED5',
    level4: '#DDD9CF',
    level5: '#D7D3C9',
  },

  outline: L.ink,
  outlineVariant: L.rule,

  inverseSurface: L.ink,
  inverseOnSurface: L.bg,
  inversePrimary: D.text,

  shadow: '#000000',
  scrim: '#000000',
  backdrop: 'rgba(27, 26, 23, 0.4)',
};

// Custom fonts register one family per weight, so every variant names its family and keeps
// fontWeight at 'normal' (Android ignores a weight on a custom family and falls back otherwise).
const sans = { 400: FONT.sans400, 500: FONT.sans500, 600: FONT.sans600, 700: FONT.sans700 } as const;
const v = (size: number, line: number, weight: keyof typeof sans, letterSpacing = 0) => ({
  fontFamily: sans[weight],
  fontSize: size,
  fontWeight: 'normal' as const,
  letterSpacing,
  lineHeight: line,
});
const fontConfig = {
  displayLarge: v(57, 64, 600, -0.25),
  displayMedium: v(45, 52, 600),
  displaySmall: v(36, 44, 600),
  headlineLarge: v(30, 36, 700, -0.6),
  headlineMedium: v(28, 34, 700, -0.56),
  headlineSmall: v(22, 28, 700),
  titleLarge: v(20, 26, 600),
  titleMedium: v(17, 22, 600),
  titleSmall: v(14, 18, 500),
  bodyLarge: v(16, 22, 400),
  bodyMedium: v(14, 20, 400),
  bodySmall: v(12, 16, 400),
  labelLarge: v(14, 20, 600),
  labelMedium: v(12, 16, 500),
  labelSmall: v(11, 14, 500),
  default: { fontFamily: FONT.sans400, fontWeight: 'normal' as const, letterSpacing: 0 },
};

type GtTheme = MD3Theme & { gt: GtColors };

export const darkTheme: GtTheme = {
  ...MD3DarkTheme,
  dark: true,
  roundness: 0,
  colors: {
    ...MD3DarkTheme.colors,
    ...darkColors,
  },
  fonts: configureFonts({ config: fontConfig }),
  gt: gtDark,
};

export const lightTheme: GtTheme = {
  ...MD3LightTheme,
  dark: false,
  roundness: 0,
  colors: {
    ...MD3LightTheme.colors,
    ...lightColors,
  },
  fonts: configureFonts({ config: fontConfig }),
  gt: gtLight,
};

export const appColors = {
  warning: palette.status.soon.light,
  success: palette.status.success,
  activeSession: palette.status.running.onLight,
  activeSessionDark: palette.status.running.onLight,
  fuelOrange: palette.status.fuelBar,
  techBlue: '#2F86A6',
};

export type AppTheme = typeof darkTheme & {
  colors: typeof darkTheme.colors;
};
