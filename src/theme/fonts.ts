import { useFonts } from 'expo-font';
import { FONT } from './tokens';

// Only the weights the design uses are bundled (the package index would pull in every weight).
const FONT_FILES = {
  [FONT.sans400]: require('@expo-google-fonts/ibm-plex-sans/400Regular/IBMPlexSans_400Regular.ttf'),
  [FONT.sans500]: require('@expo-google-fonts/ibm-plex-sans/500Medium/IBMPlexSans_500Medium.ttf'),
  [FONT.sans600]: require('@expo-google-fonts/ibm-plex-sans/600SemiBold/IBMPlexSans_600SemiBold.ttf'),
  [FONT.sans700]: require('@expo-google-fonts/ibm-plex-sans/700Bold/IBMPlexSans_700Bold.ttf'),
  [FONT.mono400]: require('@expo-google-fonts/ibm-plex-mono/400Regular/IBMPlexMono_400Regular.ttf'),
  [FONT.mono500]: require('@expo-google-fonts/ibm-plex-mono/500Medium/IBMPlexMono_500Medium.ttf'),
};

/** Loads IBM Plex Sans and Mono. Returns true once the app can render (also after a load error). */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(FONT_FILES);
  return loaded || !!error;
}
