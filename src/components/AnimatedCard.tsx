import React from 'react';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Card } from 'react-native-paper';
import type { ViewStyle } from 'react-native';

interface AnimatedCardProps {
  index?: number;
  children: React.ReactNode;
  mode?: 'elevated' | 'outlined' | 'contained';
  onPress?: () => void;
  style?: ViewStyle;
}

export function AnimatedCard({ index = 0, children, mode = 'elevated', onPress, style }: AnimatedCardProps) {
  return (
    <Animated.View entering={FadeInUp.delay(index * 80).springify()}>
      <Card mode={mode} onPress={onPress} style={style}>
        {children}
      </Card>
    </Animated.View>
  );
}
