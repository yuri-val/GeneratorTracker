import React from 'react';
import { Dialog, Portal, Button, Text } from 'react-native-paper';
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
  message = 'This action cannot be undone.',
  onDismiss,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const theme = useAppTheme();

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button textColor={theme.colors.error} onPress={onConfirm}>
            Delete
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
