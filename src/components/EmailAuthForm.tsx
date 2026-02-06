import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../theme/useAppTheme';

interface EmailAuthFormProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
}

export const EmailAuthForm: React.FC<EmailAuthFormProps> = ({ onSignIn, onSignUp }) => {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t('common.error'), t('auth.bothEmailPasswordRequired'));
      return;
    }

    if (password.length < 6) {
      Alert.alert(t('common.error'), t('auth.passwordTooShort'));
      return;
    }

    try {
      setLoading(true);
      if (isSignUp) {
        await onSignUp(email.trim(), password);
      } else {
        await onSignIn(email.trim(), password);
      }
      setEmail('');
      setPassword('');
    } catch (error: any) {
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={{ marginBottom: 12 }}>
        {isSignUp ? t('auth.createAccount') : t('auth.signInEmail')}
      </Text>

      <TextInput
        mode="outlined"
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        disabled={loading}
        left={<TextInput.Icon icon="email" />}
        style={styles.input}
      />

      <TextInput
        mode="outlined"
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoCorrect={false}
        disabled={loading}
        left={<TextInput.Icon icon="lock" />}
        right={
          <TextInput.Icon
            icon={showPassword ? 'eye-off' : 'eye'}
            onPress={() => setShowPassword(!showPassword)}
          />
        }
        style={styles.input}
      />

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        style={styles.submitButton}
        contentStyle={styles.submitButtonContent}
      >
        {isSignUp ? t('auth.createAccount') : t('auth.signIn')}
      </Button>

      <Button
        mode="text"
        onPress={() => setIsSignUp(!isSignUp)}
        disabled={loading}
      >
        {isSignUp ? t('auth.alreadyHaveAccount') : t('auth.dontHaveAccount')}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  submitButton: {
    marginBottom: 8,
  },
  submitButtonContent: {
    paddingVertical: 4,
  },
});
