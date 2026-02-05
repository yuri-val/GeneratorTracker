import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useAppTheme } from '../theme/useAppTheme';

interface EmailAuthFormProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
}

export const EmailAuthForm: React.FC<EmailAuthFormProps> = ({ onSignIn, onSignUp }) => {
  const theme = useAppTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
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
        {isSignUp ? 'Create Account' : 'Sign In with Email'}
      </Text>

      <TextInput
        mode="outlined"
        label="Email"
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
        label="Password"
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
        {isSignUp ? 'Create Account' : 'Sign In'}
      </Button>

      <Button
        mode="text"
        onPress={() => setIsSignUp(!isSignUp)}
        disabled={loading}
      >
        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
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
