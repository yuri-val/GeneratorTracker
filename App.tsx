import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme } from 'react-native';
import { PaperProvider, adaptNavigationTheme } from 'react-native-paper';
import { RootStackParamList } from './src/navigation/types';
import MainTabs from './src/navigation/MainTabs';
import GeneratorDetailScreen from './src/screens/generator/GeneratorDetailScreen';
import AddGeneratorScreen from './src/screens/generator/AddGeneratorScreen';
import AddWorkSessionScreen from './src/screens/generator/AddWorkSessionScreen';
import AddRefillScreen from './src/screens/generator/AddRefillScreen';
import AddMaintenanceScreen from './src/screens/generator/AddMaintenanceScreen';
import { AuthProvider } from './src/contexts/AuthContext';
import { darkTheme, lightTheme } from './src/theme';
import { getSavedLanguage } from './src/utils/storage';
import i18n from './src/i18n';

const Stack = createNativeStackNavigator<RootStackParamList>();

const { DarkTheme: NavDark, LightTheme: NavLight } = adaptNavigationTheme({
  reactNavigationDark: DarkTheme,
  reactNavigationLight: DefaultTheme,
  materialDark: darkTheme,
  materialLight: lightTheme,
});

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
            <Stack.Screen
              name="AddMaintenance"
              component={AddMaintenanceScreen}
              options={{ presentation: 'modal' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </AuthProvider>
  );
}
