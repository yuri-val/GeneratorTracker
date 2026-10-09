import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AccentRule, GtText, SquareButton } from '../gt';
import { useAppTheme } from '../../theme/useAppTheme';
import { size } from '../../theme/tokens';
import type { FleetItem } from '../../hooks/useFleet';
import { fmtDurationWords } from '../../utils/format';
import { sessionElapsedMs } from '../../services/sessions';

interface Props {
  /** Running generators other than the one on screen. Renders nothing when empty. */
  others: FleetItem[];
  now: number;
  onStop: (item: FleetItem) => void;
  onHome: () => void;
  /** "accessory" = inside the iOS 26 tab bar accessory (no own background or inset). */
  placement?: 'footer' | 'accessory';
}

/**
 * Live bar (3.0): what else is running while you look at another screen. One other generator →
 * name, elapsed time and Stop; two or more → a count, the names and "Go to Home".
 */
export function LiveBar({ others, now, onStop, onHome, placement = 'footer' }: Props) {
  const { t, i18n } = useTranslation();
  const { gt } = useAppTheme();
  if (others.length === 0) return null;
  const footer = placement === 'footer';
  const container = [
    styles.bar,
    footer && { backgroundColor: gt.runSurface, marginHorizontal: 12 },
    !footer && styles.accessory,
  ];
  const textColor = footer ? gt.runText : gt.text;
  const mutedColor = footer ? gt.running : gt.runningOnBg;

  if (others.length === 1) {
    const item = others[0];
    return (
      <View style={container} testID="live-bar">
        <AccentRule color={item.color} height={28} />
        <View style={styles.flex}>
          <GtText variant="meta" weight="500" color={textColor} numberOfLines={1}>
            {item.generator.name}
          </GtText>
          <GtText variant="caption" weight="500" color={mutedColor} numberOfLines={1}>
            ● {t('live.running', { duration: fmtDurationWords(sessionElapsedMs(item.running!, now), i18n.language) })}
          </GtText>
        </View>
        <SquareButton
          kind="stop"
          glyph="stop"
          height={footer ? 48 : 36}
          label={t('home.stop')}
          accessibilityLabel={t('live.stopNamed', { name: item.generator.name })}
          onPress={() => onStop(item)}
          testID="live-bar-stop"
        />
      </View>
    );
  }

  return (
    <Pressable style={container} onPress={onHome} accessibilityRole="button" testID="live-bar">
      <View style={styles.flex}>
        <GtText variant="meta" weight="600" color={mutedColor} numberOfLines={1}>
          ● {t('live.moreRunning', { count: others.length })}
        </GtText>
        <GtText variant="caption" color={footer ? gt.runMuted : gt.textMuted} numberOfLines={1}>
          {others.map(o => o.generator.name).join(', ')}
        </GtText>
      </View>
      <GtText variant="meta" weight="600" color={textColor}>
        {t('live.toHome')}
      </GtText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: { minHeight: size.liveBar, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 6 },
  accessory: { minHeight: 0, flex: 1, paddingVertical: 0 },
});
