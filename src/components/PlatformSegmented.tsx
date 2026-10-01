import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { ICONS, type IconName } from '../constants/icons';
import { isIOS } from '../theme/platform';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
  testID?: string;
}

interface PlatformSegmentedProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentOption<T>[];
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** UISegmentedControl on iOS, Material 3 segmented buttons on Android and web. */
export function PlatformSegmented<T extends string>({ value, onValueChange, options, style, testID }: PlatformSegmentedProps<T>) {
  if (isIOS) {
    return (
      <SegmentedControl
        values={options.map(o => o.label)}
        selectedIndex={Math.max(0, options.findIndex(o => o.value === value))}
        onChange={event => onValueChange(options[event.nativeEvent.selectedSegmentIndex].value)}
        style={[styles.ios, style]}
        testID={testID}
      />
    );
  }
  return (
    <SegmentedButtons
      value={value}
      onValueChange={v => onValueChange(v as T)}
      buttons={options.map(o => ({
        value: o.value,
        label: o.label,
        icon: o.icon ? ICONS[o.icon].mci : undefined,
        testID: o.testID,
      }))}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  ios: {
    height: 32,
  },
});
