import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { GtText } from './GtText';
import { useAppTheme } from '../../theme/useAppTheme';
import { size as SIZE } from '../../theme/tokens';

export type SquareButtonKind = 'stop' | 'start' | 'primary' | 'secondary' | 'outline';
type Glyph = 'stop' | 'play' | 'none';

interface Props {
  label: string;
  onPress?: () => void;
  kind: SquareButtonKind;
  glyph?: Glyph;
  /** "stacked" = glyph above the label (76×56 Home Start/Stop); "inline" = glyph left of the label. */
  layout?: 'stacked' | 'inline';
  height?: number;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /** Colours of the running card (secondary button border/text there). */
  onRunning?: boolean;
}

/** The square (radius 0) buttons of the 3.0 design. Red is reserved for Stop. */
export function SquareButton({
  label, onPress, kind, glyph = 'none', layout = 'inline', height = SIZE.primaryButton, disabled, testID, accessibilityLabel, style, onRunning,
}: Props) {
  const { gt } = useAppTheme();
  const colors = (pressed: boolean) => {
    switch (kind) {
      case 'stop':
        return { bg: pressed ? '#A93224' : gt.stop, fg: gt.onStop, border: 'transparent' };
      case 'start':
        return { bg: pressed ? gt.pressed : gt.idleButtonBg, fg: gt.idleButtonText, border: gt.idleButtonBorder };
      case 'primary':
        return gt.dark
          ? { bg: pressed ? '#D9D5CB' : gt.text, fg: '#000000', border: 'transparent' }
          : { bg: pressed ? '#33312C' : gt.text, fg: gt.bg, border: 'transparent' };
      case 'secondary':
        return onRunning
          ? { bg: pressed ? gt.runRule : gt.dark ? gt.runOutline : 'transparent', fg: gt.runText, border: gt.dark ? gt.runOutline : gt.runOutline }
          : { bg: pressed ? gt.pressed : 'transparent', fg: gt.text, border: gt.ruleStrong };
      case 'outline':
      default:
        return { bg: pressed ? gt.pressed : 'transparent', fg: gt.text, border: gt.dark ? gt.ruleStrong : gt.text };
    }
  };
  const borderWidth = kind === 'start' ? (gt.dark ? 0 : 1.5) : kind === 'secondary' ? 1 : kind === 'outline' ? 1.5 : 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      hitSlop={4}
      style={({ pressed }) => {
        const c = colors(pressed);
        return [
          {
            height,
            minWidth: layout === 'stacked' ? SIZE.startStop.w : undefined,
            paddingHorizontal: layout === 'stacked' ? 8 : 18,
            backgroundColor: c.bg,
            borderColor: c.border,
            borderWidth,
            borderRadius: 0,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: layout === 'stacked' ? 'column' : 'row',
            gap: layout === 'stacked' ? 5 : 10,
            opacity: disabled ? 0.4 : 1,
          },
          style,
        ];
      }}
    >
      {({ pressed }) => {
        const c = colors(pressed);
        return (
          <>
            {glyph === 'stop' && <View style={{ width: 12, height: 12, backgroundColor: c.fg }} />}
            {glyph === 'play' && (
              <View
                style={{
                  width: 0, height: 0, borderTopWidth: 7, borderBottomWidth: 7, borderLeftWidth: 11,
                  borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: c.fg, marginLeft: 2,
                }}
              />
            )}
            <GtText variant="meta" weight="600" color={c.fg} numberOfLines={1}>
              {label}
            </GtText>
          </>
        );
      }}
    </Pressable>
  );
}
