import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { TabParamList } from './types';
import HomeScreen from '../screens/home/HomeScreen';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import { PaperBottomTabBar } from '../components/PaperBottomTabBar';
import { ICONS } from '../constants/icons';

/**
 * Web keeps the Material 3 tab bar drawn in JS: native tab bars do not exist on web
 * (react-native-bottom-tabs ships no web implementation).
 */
const Tab = createBottomTabNavigator<TabParamList>();

export default function MainTabs() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      tabBar={props => <PaperBottomTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarStyle: { position: 'absolute' } }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t('tabs.home'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name={ICONS.home.mci} size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          tabBarLabel: t('tabs.analytics'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name={ICONS.analytics.mci} size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('tabs.settings'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name={ICONS.settings.mci} size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
