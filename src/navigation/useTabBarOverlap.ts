/**
 * How much of the screen the bottom tab bar covers. Native tabs (react-native-bottom-tabs)
 * never cover content: Android lays the screen out above the Material bar, and iOS insets
 * scroll views under the translucent bar (contentInsetAdjustmentBehavior="automatic").
 * See useTabBarOverlap.web.ts for the absolutely positioned web bar.
 */
export const useTabBarOverlap = (): number => 0;
