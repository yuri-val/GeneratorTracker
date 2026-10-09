import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { FONT } from './tokens';
import type { AppTheme } from './index';

/** iOS native bars in the 3.0 type: IBM Plex titles, ink tint, the page background under the bar. */
export const nativeHeaderStyle = (theme: AppTheme): NativeStackNavigationOptions => ({
  headerTintColor: theme.colors.onBackground,
  headerTitleStyle: { fontFamily: FONT.sans600, color: theme.colors.onBackground },
  headerLargeTitleStyle: { fontFamily: FONT.sans700, color: theme.colors.onBackground },
  headerBackTitleStyle: { fontFamily: FONT.sans500 },
});
