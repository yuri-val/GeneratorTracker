import React from 'react';
import { StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';

interface SignInButtonProps {
  onPress: () => void;
  disabled?: boolean;
  title?: string;
  icon?: string;
  mode?: 'contained' | 'outlined' | 'elevated' | 'text';
}

export const SignInButton: React.FC<SignInButtonProps> = ({
  onPress,
  disabled = false,
  title = 'Sign In',
  icon,
  mode = 'contained',
}) => {
  return (
    <Button
      mode={mode}
      onPress={onPress}
      disabled={disabled}
      icon={icon}
      style={styles.button}
      contentStyle={styles.buttonContent}
    >
      {title}
    </Button>
  );
};

const styles = StyleSheet.create({
  button: {
    marginVertical: 6,
  },
  buttonContent: {
    paddingVertical: 4,
  },
});
