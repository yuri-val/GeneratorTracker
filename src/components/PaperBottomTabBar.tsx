import React from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { BottomNavigation } from 'react-native-paper';
import { CommonActions } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useAppTheme } from '../theme/useAppTheme';

export function PaperBottomTabBar({ navigation, state, descriptors, insets }: BottomTabBarProps) {
  const theme = useAppTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <BlurView
      intensity={80}
      tint={isDark ? 'dark' : 'light'}
      style={[
        styles.blurContainer,
        {
          paddingBottom: insets.bottom,
          borderTopColor: theme.colors.outlineVariant,
        },
      ]}
    >
      <BottomNavigation.Bar
        navigationState={state}
        safeAreaInsets={{ ...insets, bottom: 0 }}
        onTabPress={({ route, preventDefault }) => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!event.defaultPrevented) {
            navigation.dispatch({
              ...CommonActions.navigate(route.name, route.params),
              target: state.key,
            });
          }
        }}
        renderIcon={({ route, focused, color }) => {
          const { options } = descriptors[route.key];
          if (options.tabBarIcon) {
            return options.tabBarIcon({ focused, color, size: 24 });
          }
          return null;
        }}
        getLabelText={({ route }) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel;
          if (typeof label === 'string') return label;
          if (options.title) return options.title;
          return route.name;
        }}
        style={styles.bar}
        activeIndicatorStyle={{ backgroundColor: theme.colors.primaryContainer }}
      />
    </BlurView>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  bar: {
    backgroundColor: 'transparent',
  },
});
