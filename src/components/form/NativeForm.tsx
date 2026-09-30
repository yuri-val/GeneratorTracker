import type { FormSection } from './types';

export type { FormField, FormSection } from './types';

/**
 * The native form is iOS-only (NativeForm.ios.tsx, SwiftUI via @expo/ui); Android and
 * web render their Material (react-native-paper) forms and never mount this.
 */
export function NativeForm(_props: { sections: FormSection[] }): null {
  return null;
}
