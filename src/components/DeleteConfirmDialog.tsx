import React from 'react';
import { Dialog, Portal, Button, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../theme/useAppTheme';

interface DeleteConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  onDismiss: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({
  visible,
  title,
  message,
  onDismiss,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">{message || t('common.undoWarning')}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>{t('common.cancel')}</Button>
          <Button textColor={theme.colors.error} onPress={onConfirm}>
            {t('common.delete')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
