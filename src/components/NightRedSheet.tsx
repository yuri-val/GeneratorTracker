import React from 'react';
import { Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GtText, SquareButton } from './gt';
import { useAppTheme } from '../theme/useAppTheme';

/**
 * "Night red mode" (3.0, design 5h): not an in-app theme but instructions for the system colour
 * filter, which tints the whole phone (keyboard included) and keeps night vision.
 */
export function NightRedSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { gt } = useAppTheme();
  const insets = useSafeAreaInsets();

  // iOS: only the app's own settings page is reachable with public API (App-prefs: URLs are
  // rejected in App Review). Android: the accessibility settings intent.
  const openAccessibility = () => {
    if (Platform.OS === 'android') {
      Linking.sendIntent('android.settings.ACCESSIBILITY_SETTINGS').catch(() => Linking.openSettings());
    } else {
      Linking.openSettings();
    }
  };

  const ink = gt.dark ? gt.raised : gt.runSurface;
  const text = gt.dark ? gt.text : gt.runText;
  const muted = gt.dark ? gt.textMuted : '#C9C4B8';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} onPress={onClose} accessibilityLabel={t('settings.nightRedClose')} />
      <View style={[styles.sheet, { backgroundColor: ink, paddingBottom: insets.bottom + 20 }]} testID="night-red-sheet">
        <ScrollView contentContainerStyle={styles.content}>
          <GtText variant="cardTitle" color={text} accessibilityRole="header">
            {t('settings.nightRedTitle')}
          </GtText>
          <GtText variant="meta" color={muted}>
            {t('settings.nightRedBody')}
          </GtText>
          <View style={[styles.rule, { backgroundColor: gt.dark ? gt.ruleStrong : '#3A3833' }]} />
          <GtText variant="rowTitle" weight="600" color={text}>
            iPhone
          </GtText>
          <GtText variant="meta" color={muted}>
            1. {t('settings.nightRedIOS1')}
          </GtText>
          <GtText variant="meta" color={muted}>
            2. {t('settings.nightRedIOS2')}
          </GtText>
          <GtText variant="rowTitle" weight="600" color={text}>
            Android
          </GtText>
          <GtText variant="meta" color={muted}>
            {t('settings.nightRedAndroid')}
          </GtText>
          <SquareButton kind="secondary" onRunning label={t('settings.openAccessibility')} onPress={openAccessibility} testID="open-accessibility" />
          <SquareButton kind="secondary" onRunning label={t('settings.nightRedClose')} onPress={onClose} testID="night-red-close" />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '85%' },
  content: { padding: 18, gap: 12 },
  rule: { height: 1 },
});
