import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme } from 'react-native';
import { PaperProvider, adaptNavigationTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootStackParamList } from './src/navigation/types';
import MainTabs from './src/navigation/MainTabs';
import GeneratorDetailScreen from './src/screens/generator/GeneratorDetailScreen';
import AddGeneratorScreen from './src/screens/generator/AddGeneratorScreen';
import AddWorkSessionScreen from './src/screens/generator/AddWorkSessionScreen';
import AddRefillScreen from './src/screens/generator/AddRefillScreen';
import AddMaintenanceScreen from './src/screens/generator/AddMaintenanceScreen';
import { AuthProvider } from './src/contexts/AuthContext';
import { darkTheme, lightTheme } from './src/theme';
import { useAppFonts } from './src/theme/fonts';
import { nativeHeaderStyle } from './src/theme/navigation';
import { ThemePreferenceProvider } from './src/contexts/ThemePreferenceContext';
import { SnackbarProvider } from './src/components/gt';
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
  return (
    <SafeAreaProvider>
      <ThemePreferenceProvider>
        <AppContent />
      </ThemePreferenceProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const fontsReady = useAppFonts();
  // Follows the system, or the override from Settings → Appearance (Appearance.setColorScheme).
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

  // The native splash stays up until IBM Plex is registered, so text never re-flows.
  if (!fontsReady) return null;

  return (
    <AuthProvider>
      <PaperProvider theme={paperTheme}>
        <NavigationContainer theme={navTheme}>
          <SnackbarProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack.Navigator
            screenOptions={{
              // iOS: native navigation bars, configured by each screen's ScreenHeader. Modal
              // screens only get a bar when it is enabled at mount, so enable it up front.
              // Android/web draw a Material app bar inside the screen instead.
              headerShown: Platform.OS === 'ios',
              contentStyle: { backgroundColor: paperTheme.colors.background },
              ...nativeHeaderStyle(paperTheme),
            }}
          >
            <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
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
          </SnackbarProvider>
        </NavigationContainer>
      </PaperProvider>
    </AuthProvider>
  );
}
