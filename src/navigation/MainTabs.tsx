import React from 'react';
import { Platform } from 'react-native';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { TabParamList } from './types';
import HomeScreen from '../screens/home/HomeScreen';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import { ICONS } from '../constants/icons';
import { useAppTheme } from '../theme/useAppTheme';
import { nativeHeaderStyle } from '../theme/navigation';
import { FONT } from '../theme/tokens';

/**
 * Native bottom tabs: UITabBar on iOS (Liquid Glass on iOS 26+), Material 3
 * BottomNavigationView on Android. The web build uses MainTabs.web.tsx.
 */
const Tab = createNativeBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator();

// Android tab icons must be images; these are the Material Design Icons glyphs the
// app already uses (MaterialCommunityIcons flash / chart-bar / cog).
const ANDROID_TAB_ICONS = {
  Home: require('../../assets/tabs/flash.svg'),
  Analytics: require('../../assets/tabs/chart-bar.svg'),
  Settings: require('../../assets/tabs/cog.svg'),
};

/**
 * Each tab hosts its own native stack so that iOS shows a native navigation bar with a
 * large title on the tab root. Android keeps the Material top app bar rendered by the
 * screen itself (ScreenHeader), so the stack header is hidden there.
 */
function withTabStack(name: string, Component: React.ComponentType) {
  function TabStack() {
    const theme = useAppTheme();
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: Platform.OS === 'ios',
          contentStyle: { backgroundColor: theme.colors.background },
          ...nativeHeaderStyle(theme),
        }}
      >
        <Stack.Screen name={`${name}Root`} component={Component} />
      </Stack.Navigator>
    );
  }
  TabStack.displayName = `${name}TabStack`;
  return TabStack;
}

const HomeTab = withTabStack('Home', HomeScreen);
const AnalyticsTab = withTabStack('Analytics', AnalyticsScreen);
const SettingsTab = withTabStack('Settings', SettingsScreen);

export default function MainTabs() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const icon = (name: keyof typeof ANDROID_TAB_ICONS, sf: (typeof ICONS)[keyof typeof ICONS]['sf']) => () =>
    Platform.OS === 'ios' ? { sfSymbol: sf } : ANDROID_TAB_ICONS[name];

  return (
    <Tab.Navigator
      tabBarActiveTintColor={theme.colors.onBackground}
      tabBarInactiveTintColor={theme.colors.onSurfaceVariant}
      activeIndicatorColor={theme.colors.primaryContainer}
      rippleColor={theme.colors.primaryContainer}
      tabLabelStyle={Platform.OS === 'android' ? { fontFamily: FONT.sans600, fontSize: 11 } : undefined}
      tabBarStyle={Platform.OS === 'android' ? { backgroundColor: theme.colors.background } : undefined}
      hapticFeedbackEnabled
    >
      <Tab.Screen
        name="Home"
        component={HomeTab}
        options={{ title: t('tabs.home'), tabBarIcon: icon('Home', ICONS.home.sf), tabBarButtonTestID: 'tab-home' }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsTab}
        options={{
          title: t('tabs.analytics'),
          tabBarIcon: icon('Analytics', ICONS.analytics.sf),
          tabBarButtonTestID: 'tab-analytics',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsTab}
        options={{
          title: t('tabs.settings'),
          tabBarIcon: icon('Settings', ICONS.settings.sf),
          tabBarButtonTestID: 'tab-settings',
        }}
      />
    </Tab.Navigator>
  );
}
