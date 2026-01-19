import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useColorScheme } from 'react-native';
import { RootStackParamList, TabParamList } from './src/navigation/types';
import HomeScreen from './src/screens/home/HomeScreen';
import AnalyticsScreen from './src/screens/analytics/AnalyticsScreen';
import GeneratorDetailScreen from './src/screens/generator/GeneratorDetailScreen';
import AddGeneratorScreen from './src/screens/generator/AddGeneratorScreen';
import AddWorkSessionScreen from './src/screens/generator/AddWorkSessionScreen';
import AddRefillScreen from './src/screens/generator/AddRefillScreen';
import { Colors } from './src/constants/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} label="⚡" />
          ),
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          tabBarLabel: 'Analytics',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} label="📊" />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function TabIcon({ focused, color, label }: { focused: boolean; color: string; label: string }) {
  const Text = require('react-native').Text;
  return <Text style={{ fontSize: 24 }}>{label}</Text>;
}

export default function App() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <NavigationContainer>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="GeneratorDetail"
          component={GeneratorDetailScreen}
          options={{ presentation: 'card' }}
        />
        <Stack.Screen
          name="AddGenerator"
          component={AddGeneratorScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="AddWorkSession"
          component={AddWorkSessionScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="AddRefill"
          component={AddRefillScreen}
          options={{ presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
