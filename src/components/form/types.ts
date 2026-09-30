/**
 * Declarative description of a native iOS form (rendered by NativeForm.ios.tsx as a
 * SwiftUI Form). Screens keep their state and logic and only describe the fields.
 */
export type FormField =
  | {
      kind: 'text';
      key: string;
      label: string;
      value: string;
      onChange: (value: string) => void;
      placeholder?: string;
      keyboard?: 'default' | 'decimal' | 'number' | 'email';
      /** Unit shown after the value, e.g. "h" or "L". */
      suffix?: string;
      secure?: boolean;
      autoCapitalize?: boolean;
      testID?: string;
    }
  | {
      kind: 'notes';
      key: string;
      value: string;
      onChange: (value: string) => void;
      placeholder: string;
      testID?: string;
    }
  | {
      kind: 'date';
      key: string;
      label: string;
      /** 'YYYY-MM-DD' (local calendar date). */
      value: string;
      onChange: (value: string) => void;
      /** Latest selectable date; defaults to today. */
      maxDate?: Date;
    }
  | {
      kind: 'time';
      key: string;
      label: string;
      /** 'HH:mm'. */
      value: string;
      onChange: (value: string) => void;
    }
  | {
      kind: 'info';
      key: string;
      label: string;
      value: string;
      tone?: 'accent' | 'muted' | 'error';
    }
  | {
      kind: 'button';
      key: string;
      label: string;
      onPress: () => void;
      destructive?: boolean;
      systemImage?: 'plus' | 'trash' | 'clock' | 'arrow.clockwise' | 'rectangle.portrait.and.arrow.right' | 'person.crop.circle.badge.plus';
      disabled?: boolean;
      testID?: string;
    }
  | {
      kind: 'picker';
      key: string;
      label: string;
      value: string;
      options: { value: string; label: string }[];
      onChange: (value: string) => void;
    };

export interface FormSection {
  key: string;
  title?: string;
  /** Explanatory text under the section. */
  footer?: string;
  /** Validation message under the section, shown in the error colour. */
  error?: string;
  fields: FormField[];
}
