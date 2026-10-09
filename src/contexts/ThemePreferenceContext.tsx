import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Appearance, Platform } from 'react-native';
import { getThemePreference, saveThemePreference, type ThemePreference } from '../utils/storage';

interface ThemePreferenceValue {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemePreferenceContext = createContext<ThemePreferenceValue>({ preference: 'system', setPreference: () => {} });

/**
 * "Settings → Appearance → Theme". Applied through Appearance.setColorScheme so native UI (iOS bars,
 * SwiftUI forms, alerts, Android dialogs) follows too; useColorScheme() then returns the override.
 */
export function ThemePreferenceProvider({ children }: { children: React.ReactNode }) {
  const [preference, setState] = useState<ThemePreference>('system');

  const apply = (value: ThemePreference) => {
    if (Platform.OS === 'web') return;
    Appearance.setColorScheme(value === 'system' ? 'unspecified' : value);
  };

  useEffect(() => {
    getThemePreference().then(value => {
      setState(value);
      apply(value);
    });
  }, []);

  const setPreference = useCallback((value: ThemePreference) => {
    setState(value);
    apply(value);
    saveThemePreference(value);
  }, []);

  return <ThemePreferenceContext.Provider value={{ preference, setPreference }}>{children}</ThemePreferenceContext.Provider>;
}

export const useThemePreference = () => useContext(ThemePreferenceContext);
