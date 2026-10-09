import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GtText } from './GtText';
import { useAppTheme } from '../../theme/useAppTheme';

export interface SnackbarOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Milliseconds; 5 s for undo (design), 6 s for "start again". */
  duration?: number;
  testID?: string;
}

interface SnackbarApi {
  show: (options: SnackbarOptions) => void;
  hide: () => void;
  /** Distance from the bottom safe-area edge, set by the focused screen (tab bar, live bar…). */
  setBottomOffset: (offset: number) => void;
}

const SnackbarContext = createContext<SnackbarApi>({ show: () => {}, hide: () => {}, setBottomOffset: () => {} });

/** One app-wide snackbar (3.0): Stop → "Undo", refill saved → "Start again". A new one replaces the old. */
export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const { gt } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<(SnackbarOptions & { key: number }) | null>(null);
  const [bottomOffset, setBottomOffset] = useState(TAB_BAR_OFFSET);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setCurrent(null);
  }, []);

  const show = useCallback((options: SnackbarOptions) => {
    if (timer.current) clearTimeout(timer.current);
    setCurrent({ ...options, key: Date.now() });
    timer.current = setTimeout(() => setCurrent(null), options.duration ?? 5000);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <SnackbarContext.Provider value={{ show, hide, setBottomOffset }}>
      {children}
      {current && (
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}>
          <Animated.View
            key={current.key}
            entering={FadeInDown.duration(180)}
            exiting={FadeOutDown.duration(150)}
            accessibilityLiveRegion="polite"
            testID={current.testID ?? 'snackbar'}
            style={[styles.bar, { backgroundColor: gt.snackBg, marginBottom: insets.bottom + bottomOffset }]}
          >
            <GtText variant="meta" weight="500" color={gt.snackText} style={styles.message} numberOfLines={2}>
              {current.message}
            </GtText>
            {current.actionLabel && (
              <Pressable
                accessibilityRole="button"
                testID="snackbar-action"
                hitSlop={8}
                onPress={() => {
                  hide();
                  current.onAction?.();
                }}
              >
                <GtText variant="meta" weight="600" color={gt.snackAction}>
                  {current.actionLabel}
                </GtText>
              </Pressable>
            )}
          </Animated.View>
        </View>
      )}
    </SnackbarContext.Provider>
  );
}

export const useSnackbar = () => useContext(SnackbarContext);

/** Above the native tab bar (49 pt iOS, 80 dp Material) with a 12 pt gap. */
export const TAB_BAR_OFFSET = 68;

/** Keep the snackbar above this screen's bottom chrome while it is focused. */
export function useSnackbarBottomOffset(offset: number) {
  const { setBottomOffset } = useSnackbar();
  useFocusEffect(
    useCallback(() => {
      setBottomOffset(offset);
    }, [offset, setBottomOffset]),
  );
}

const styles = StyleSheet.create({
  bar: {
    marginHorizontal: 12,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 0,
  },
  message: { flex: 1 },
});
