import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

interface DeleteConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  onDismiss: () => void;
  onConfirm: () => void;
}

/**
 * iOS/Android: the system alert (UIAlertController / Material AlertDialog) with a
 * destructive Delete action. Same API as the web Paper dialog (DeleteConfirmDialog.tsx).
 */
export function DeleteConfirmDialog({ visible, title, message, onDismiss, onConfirm }: DeleteConfirmDialogProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!visible) return;
    Alert.alert(
      title,
      message || t('common.undoWarning'),
      [
        { text: t('common.cancel'), style: 'cancel', onPress: onDismiss },
        { text: t('common.delete'), style: 'destructive', onPress: onConfirm },
      ],
      { cancelable: true, onDismiss }
    );
    // Show once per opening; the handlers are read when the alert is created.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return null;
}
