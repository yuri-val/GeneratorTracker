import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { FONT, type } from '../../theme/tokens';
import { useAppTheme } from '../../theme/useAppTheme';

// 3.0 typography: IBM Plex Sans for every label (sentence case), IBM Plex Mono for digits only.
export type GtVariant = keyof typeof type extends infer K ? Exclude<K, 'sans' | 'mono'> : never;
type Weight = '400' | '500' | '600' | '700';

const SANS: Record<Weight, string> = { '400': FONT.sans400, '500': FONT.sans500, '600': FONT.sans600, '700': FONT.sans700 };
const MONO: Record<Weight, string> = { '400': FONT.mono400, '500': FONT.mono500, '600': FONT.mono500, '700': FONT.mono500 };

const LETTER_SPACING: Partial<Record<GtVariant, number>> = { largeTitle: -0.6, screenTitle: -0.56, timerDetail: -1.4 };

export interface GtTextProps extends TextProps {
  variant?: GtVariant;
  weight?: Weight;
  mono?: boolean;
  color?: string;
  size?: number;
  tabular?: boolean;
}

export const fontFor = (weight: Weight, mono = false) => (mono ? MONO : SANS)[weight];

export function GtText({ variant = 'body', weight, mono, color, size, tabular, style, ...rest }: GtTextProps) {
  const { gt } = useAppTheme();
  const [fontSize, lineHeight, defaultWeight] = type[variant] as readonly [number, number, string];
  const isMono = mono ?? (variant === 'timerDetail' || variant === 'stepper');
  const base: TextStyle = {
    fontFamily: fontFor((weight ?? defaultWeight) as Weight, isMono),
    fontSize: size ?? fontSize,
    lineHeight: size ? Math.round(size * (lineHeight / fontSize)) : lineHeight,
    letterSpacing: LETTER_SPACING[variant] ?? 0,
    color: color ?? gt.text,
    fontVariant: tabular || isMono ? ['tabular-nums'] : undefined,
  };
  return <Text style={[base, style]} {...rest} />;
}

/** Digits inside a sans line: "Пальне ≈ <Num>2,4</Num> л". Inherits size and colour unless given. */
export function Num({ children, color, weight = '500', style }: { children: React.ReactNode; color?: string; weight?: Weight; style?: TextStyle }) {
  return <Text style={[{ fontFamily: fontFor(weight, true), fontVariant: ['tabular-nums'] }, color ? { color } : null, style]}>{children}</Text>;
}
