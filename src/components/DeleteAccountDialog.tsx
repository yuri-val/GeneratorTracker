import React, { useEffect, useState } from 'react';
import { Dialog, Portal, Button, Text, TextInput, HelperText } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../theme/useAppTheme';

interface DeleteAccountDialogProps {
  visible: boolean;
  /** Email accounts confirm with their password; anonymous accounts just confirm. */
  email?: string | null;
  needsPassword: boolean;
  busy: boolean;
  /** Shown under the password field (e.g. wrong password). */
  error?: string;
  onDismiss: () => void;
  onConfirm: (password?: string) => void;
}

/**
 * Android/web confirmation for account deletion (Material dialog). iOS uses the system
 * alert with a secure text prompt instead (see SettingsScreen).
 */
export function DeleteAccountDialog({ visible, email, needsPassword, busy, error, onDismiss, onConfirm }: DeleteAccountDialogProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!visible) setPassword('');
  }, [visible]);

  const canConfirm = !busy && (!needsPassword || password.length > 0);

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={busy ? undefined : onDismiss} testID="delete-account-dialog">
        <Dialog.Title>{t('settings.deleteAccountTitle')}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">{t('settings.deleteAccountMessage')}</Text>
          {needsPassword && (
            <>
              <Text variant="bodyMedium" style={{ marginTop: 16, marginBottom: 8 }}>
                {t('settings.deleteAccountPasswordMessage', { email: email ?? '' })}
              </Text>
              <TextInput
                mode="outlined"
                label={t('settings.deleteAccountPasswordLabel')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                disabled={busy}
                testID="input-delete-password"
                error={!!error}
              />
              <HelperText type="error" visible={!!error}>
                {error}
              </HelperText>
            </>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button
            textColor={theme.colors.error}
            onPress={() => onConfirm(needsPassword ? password : undefined)}
            disabled={!canConfirm}
            loading={busy}
            testID="confirm-delete-account"
          >
            {t('settings.deleteAccountConfirm')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
