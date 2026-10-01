import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

/** The web JS tab bar (PaperBottomTabBar) floats over the content: its full height. */
export const useTabBarOverlap = (): number => useBottomTabBarHeight();
