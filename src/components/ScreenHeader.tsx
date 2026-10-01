import React, { useLayoutEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Appbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { ICONS, type IconName } from '../constants/icons';
import { useAppTheme } from '../theme/useAppTheme';

export interface HeaderAction {
  key: string;
  /** Accessibility label (and the visible label for iOS text buttons). */
  label: string;
  icon: IconName;
  onPress: () => void;
  testID?: string;
  /** iOS: `prominent` = filled glass button for the primary action, `done` = confirm. */
  variant?: 'plain' | 'prominent' | 'done';
  destructive?: boolean;
}

export interface HeaderMenuAction {
  key: string;
  label: string;
  icon?: IconName;
  /** Checkmark state for pickers (e.g. a filter); omit for plain commands. */
  selected?: boolean;
  destructive?: boolean;
  onPress: () => void;
}

interface ScreenHeaderProps {
  title: string;
  /** iOS large title (tab root screens). */
  largeTitle?: boolean;
  /** `back` for pushed screens, `close` for modal forms. */
  leading?: 'back' | 'close';
  onLeadingPress?: () => void;
  leadingTestID?: string;
  actions?: HeaderAction[];
  /** iOS: a pull-down menu button (e.g. a filter); Android/web render nothing for it. */
  menu?: { label: string; icon: IconName; actions: HeaderMenuAction[] };
  /** Extra element on the trailing side (e.g. the sync indicator). */
  trailing?: React.ReactNode;
  /** Android/web: tapping the title (the detail screen opens the editor). */
  onTitlePress?: () => void;
  titleTestID?: string;
  elevated?: boolean;
  /**
   * iOS: transparent bar over the content with the system scroll-edge effect (iOS 26+).
   * Only for screens whose root is a ScrollView/FlatList with
   * contentInsetAdjustmentBehavior="automatic"; other screens keep an opaque bar.
   */
  scrollEdge?: boolean;
}

/**
 * The screen's top bar, native to each platform:
 * - iOS: the native navigation bar of the native stack (large titles, SF Symbol bar
 *   buttons that become Liquid Glass on iOS 26+). The component renders nothing and
 *   configures the navigator instead.
 * - Android/web: a Material 3 top app bar (react-native-paper `Appbar`).
 */
export function ScreenHeader(props: ScreenHeaderProps) {
  return Platform.OS === 'ios' ? <NativeHeader {...props} /> : <MaterialHeader {...props} />;
}

function NativeHeader(props: ScreenHeaderProps) {
  const navigation = useNavigation();
  const theme = useAppTheme();
  // Handlers change identity on every render; keep the latest ones in a ref and only
  // reconfigure the native bar when something visible changes (setOptions re-renders
  // the navigator, so running it on every render would loop).
  const latest = useRef(props);
  latest.current = props;

  const { title, largeTitle, leading, actions = [], menu, trailing, scrollEdge } = props;
  const signature = JSON.stringify({
    title,
    largeTitle,
    leading,
    actions: actions.map(({ key, label, icon, variant, destructive, testID }) => [key, label, icon, variant, destructive, testID]),
    menu: menu && [menu.label, menu.icon, menu.actions.map(a => [a.key, a.label, a.icon, a.selected, a.destructive])],
    trailing: !!trailing,
    scrollEdge,
    tint: theme.colors.primary,
    label: theme.colors.onBackground,
    error: theme.colors.error,
  });

  useLayoutEffect(() => {
    const current = latest.current;
    const currentActions = current.actions ?? [];
    const options: NativeStackNavigationOptions = {
      headerShown: true,
      title: current.title,
      headerLargeTitleEnabled: !!current.largeTitle,
      headerTransparent: !!current.scrollEdge,
      headerShadowVisible: !current.scrollEdge ? false : undefined,
      // `automatic` resolves to the hard style (tinted band + divider) for these bars.
      scrollEdgeEffects: current.scrollEdge ? { top: 'soft' } : undefined,
      // Brand tint for bar buttons only; titles keep the system label colour (HIG).
      headerTintColor: theme.colors.primary,
      headerTitleStyle: { color: theme.colors.onBackground },
      headerLargeTitleStyle: { color: theme.colors.onBackground },
      headerBackButtonDisplayMode: 'minimal',
      unstable_headerLeftItems:
        current.leading === 'close'
          ? () => [
              {
                type: 'button',
                label: 'Close',
                accessibilityLabel: 'Close',
                icon: { type: 'sfSymbol', name: ICONS.close.sf },
                onPress: () => latest.current.onLeadingPress?.(),
              },
            ]
          : undefined,
      unstable_headerRightItems: () => [
        ...(current.trailing
          ? [{ type: 'custom' as const, element: <>{current.trailing}</>, hidesSharedBackground: true }]
          : []),
        ...(current.menu
          ? [
              {
                type: 'menu' as const,
                label: current.menu.label,
                accessibilityLabel: current.menu.label,
                icon: { type: 'sfSymbol' as const, name: ICONS[current.menu.icon].sf },
                menu: {
                  items: current.menu.actions.map(action => ({
                    type: 'action' as const,
                    label: action.label,
                    icon: action.icon && { type: 'sfSymbol' as const, name: ICONS[action.icon].sf },
                    state: action.selected === undefined ? undefined : action.selected ? ('on' as const) : ('off' as const),
                    destructive: action.destructive,
                    onPress: () => latest.current.menu?.actions.find(a => a.key === action.key)?.onPress(),
                  })),
                },
              },
            ]
          : []),
        ...currentActions.map(action => ({
          type: 'button' as const,
          label: action.label,
          accessibilityLabel: action.label,
          icon: { type: 'sfSymbol' as const, name: ICONS[action.icon].sf },
          variant: action.variant ?? ('plain' as const),
          tintColor: action.destructive ? theme.colors.error : undefined,
          identifier: action.testID,
          onPress: () => latest.current.actions?.find(a => a.key === action.key)?.onPress(),
        })),
      ],
    };
    navigation.setOptions(options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, signature]);

  return null;
}

function MaterialHeader({
  title,
  leading,
  onLeadingPress,
  leadingTestID,
  actions = [],
  trailing,
  onTitlePress,
  titleTestID,
  elevated = true,
}: ScreenHeaderProps) {
  const theme = useAppTheme();
  return (
    <Appbar.Header elevated={elevated}>
      {leading === 'back' && onLeadingPress && <Appbar.BackAction onPress={onLeadingPress} testID={leadingTestID} />}
      {leading === 'close' && onLeadingPress && (
        <Appbar.Action icon={ICONS.close.mci} onPress={onLeadingPress} testID={leadingTestID} accessibilityLabel="Close" />
      )}
      <Appbar.Content
        title={title}
        titleStyle={{ fontWeight: leading ? '600' : '700' }}
        onPress={onTitlePress}
        testID={titleTestID}
      />
      {trailing}
      {actions.map(action => (
        <Appbar.Action
          key={action.key}
          icon={ICONS[action.icon].mci}
          iconColor={action.destructive ? theme.colors.error : undefined}
          onPress={action.onPress}
          accessibilityLabel={action.label}
          testID={action.testID}
        />
      ))}
    </Appbar.Header>
  );
}
