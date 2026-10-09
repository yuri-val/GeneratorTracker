import { useCallback } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import type { WorkSession } from '../models/types';
import { startSession, stopSession, undoStop } from '../services/sessions';
import { useSnackbar } from '../components/gt';
import { fmtNumber } from '../utils/format';

/**
 * Start / Stop with the 3.0 behaviour everywhere (Home, generator screen, live bar): start is one
 * tap; stop has no confirmation, a success haptic and a 5 s "Undo" snackbar.
 * `onChange` reloads the caller's data after every write (including undo).
 */
export function useSessionActions(onChange: () => void | Promise<void>) {
  const { t, i18n } = useTranslation();
  const snackbar = useSnackbar();

  const start = useCallback(
    async (generatorId: string) => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await startSession(generatorId);
        await onChange();
      } catch (error) {
        console.error(error);
        Alert.alert(t('common.error'), t('detail.failedToStartSession'));
      }
    },
    [onChange, t],
  );

  const stop = useCallback(
    async (running: WorkSession, generatorName: string) => {
      try {
        const { stopped } = await stopSession(running);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await onChange();
        snackbar.show({
          message: t('detail.sessionStoppedUndo', { hours: fmtNumber(stopped.hours, i18n.language), name: generatorName }),
          actionLabel: t('common.cancel'),
          duration: 5000,
          testID: 'snackbar-stopped',
          onAction: async () => {
            await undoStop(running);
            await onChange();
          },
        });
      } catch (error) {
        console.error(error);
        Alert.alert(t('common.error'), t('detail.failedToStopSession'));
      }
    },
    [onChange, snackbar, t, i18n.language],
  );

  return { start, stop };
}
