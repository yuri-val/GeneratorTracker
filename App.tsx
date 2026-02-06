import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useColorScheme } from 'react-native';
import { PaperProvider, adaptNavigationTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RootStackParamList, TabParamList } from './src/navigation/types';
import HomeScreen from './src/screens/home/HomeScreen';
import AnalyticsScreen from './src/screens/analytics/AnalyticsScreen';
import SettingsScreen from './src/screens/settings/SettingsScreen';
import GeneratorDetailScreen from './src/screens/generator/GeneratorDetailScreen';
import AddGeneratorScreen from './src/screens/generator/AddGeneratorScreen';
import AddWorkSessionScreen from './src/screens/generator/AddWorkSessionScreen';
import AddRefillScreen from './src/screens/generator/AddRefillScreen';
import { AuthProvider } from './src/contexts/AuthContext';
import { darkTheme, lightTheme } from './src/theme';
import { PaperBottomTabBar } from './src/components/PaperBottomTabBar';
import { getSavedLanguage } from './src/utils/storage';
import i18n from './src/i18n';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const { DarkTheme: NavDark, LightTheme: NavLight } = adaptNavigationTheme({
  reactNavigationDark: DarkTheme,
  reactNavigationLight: DefaultTheme,
  materialDark: darkTheme,
  materialLight: lightTheme,
});

function MainTabs() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      tabBar={(props) => <PaperBottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { position: 'absolute' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t('tabs.home'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="flash" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          tabBarLabel: t('tabs.analytics'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-bar" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('tabs.settings'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const paperTheme = isDark ? darkTheme : lightTheme;
  const navTheme = isDark ? NavDark : NavLight;

  useEffect(() => {
    const loadLanguage = async () => {
      const savedLanguage = await getSavedLanguage();
      if (savedLanguage && savedLanguage !== i18n.language) {
        i18n.changeLanguage(savedLanguage);
      }
    };
    loadLanguage();
  }, []);

  return (
    <AuthProvider>
      <PaperProvider theme={paperTheme}>
        <NavigationContainer theme={navTheme}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: paperTheme.colors.background },
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
      </PaperProvider>
    </AuthProvider>
  );
}
