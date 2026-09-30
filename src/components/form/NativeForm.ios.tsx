import React, { useEffect, useRef } from 'react';
import {
  Host,
  Form,
  Section,
  TextField,
  SecureField,
  LabeledContent,
  DatePicker,
  Text,
  Button,
  Picker,
  HStack,
  useNativeState,
  type TextFieldProps,
} from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  foregroundStyle,
  keyboardType,
  lineLimit,
  multilineTextAlignment,
  pickerStyle,
  scrollDismissesKeyboard,
  tag,
  textInputAutocapitalization,
  autocorrectionDisabled,
  tint,
  monospacedDigit,
  disabled,
} from '@expo/ui/swift-ui/modifiers';
import { useAppTheme } from '../../theme/useAppTheme';
import { parseLocalDate, toLocalDateString } from '../../utils/calculations';
import type { FormField, FormSection } from './types';

export type { FormField, FormSection } from './types';

const KEYBOARD = {
  default: 'default',
  decimal: 'decimal-pad',
  number: 'numeric',
  email: 'email-address',
} as const;

const timeToDate = (time: string): Date => {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
};

const dateToTime = (date: Date): string =>
  `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

/**
 * A SwiftUI text field bound to React state: typing reports through onChange, and a
 * value changed from outside (e.g. loaded for editing) is pushed into the native state.
 */
function BoundTextField({
  value,
  onChange,
  placeholder,
  secure,
  modifiers,
  axis,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  secure?: boolean;
  modifiers: TextFieldProps['modifiers'];
  axis?: 'vertical';
}) {
  const state = useNativeState(value);
  const lastReported = useRef(value);

  useEffect(() => {
    if (value !== lastReported.current) {
      lastReported.current = value;
      state.value = value;
    }
  }, [value, state]);

  const handleChange = (text: string) => {
    lastReported.current = text;
    onChange(text);
  };

  return secure ? (
    <SecureField text={state} placeholder={placeholder} onTextChange={handleChange} modifiers={modifiers} />
  ) : (
    <TextField text={state} placeholder={placeholder} onTextChange={handleChange} modifiers={modifiers} axis={axis} />
  );
}

function Field({ field }: { field: FormField }) {
  const theme = useAppTheme();

  switch (field.kind) {
    case 'text': {
      const modifiers = [
        multilineTextAlignment('trailing'),
        keyboardType(KEYBOARD[field.keyboard ?? 'default']),
        ...(field.keyboard === 'email' || field.secure || field.autoCapitalize === false
          ? [textInputAutocapitalization('never'), autocorrectionDisabled()]
          : []),
        ...(field.testID ? [accessibilityIdentifier(field.testID)] : []),
      ];
      const input = (
        <BoundTextField
          value={field.value}
          onChange={field.onChange}
          placeholder={field.placeholder}
          secure={field.secure}
          modifiers={modifiers}
        />
      );
      return (
        <LabeledContent label={field.label}>
          {field.suffix ? (
            <HStack spacing={4}>
              {input}
              <Text modifiers={[foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>{field.suffix}</Text>
            </HStack>
          ) : (
            input
          )}
        </LabeledContent>
      );
    }
    case 'notes':
      return (
        <BoundTextField
          value={field.value}
          onChange={field.onChange}
          placeholder={field.placeholder}
          axis="vertical"
          modifiers={[lineLimit({ min: 3, max: 8 }), ...(field.testID ? [accessibilityIdentifier(field.testID)] : [])]}
        />
      );
    case 'date':
      return (
        <DatePicker
          title={field.label}
          selection={parseLocalDate(field.value)}
          displayedComponents={['date']}
          range={{ end: field.maxDate ?? new Date() }}
          onDateChange={date => field.onChange(toLocalDateString(date))}
        />
      );
    case 'time':
      return (
        <DatePicker
          title={field.label}
          selection={timeToDate(field.value)}
          displayedComponents={['hourAndMinute']}
          onDateChange={date => field.onChange(dateToTime(date))}
        />
      );
    case 'info': {
      const color =
        field.tone === 'accent' ? theme.colors.primary : field.tone === 'error' ? theme.colors.error : undefined;
      return (
        <LabeledContent label={field.label}>
          <Text
            modifiers={[
              monospacedDigit(),
              foregroundStyle(color ?? { type: 'hierarchical', style: 'secondary' }),
            ]}
          >
            {field.value}
          </Text>
        </LabeledContent>
      );
    }
    case 'button':
      return (
        <Button
          label={field.label}
          systemImage={field.systemImage}
          role={field.destructive ? 'destructive' : 'default'}
          onPress={field.onPress}
          modifiers={[
            ...(field.disabled ? [disabled(true)] : []),
            ...(field.testID ? [accessibilityIdentifier(field.testID)] : []),
          ]}
        />
      );
    case 'picker':
      return (
        <Picker
          label={field.label}
          selection={field.value}
          onSelectionChange={value => field.onChange(String(value))}
          modifiers={[pickerStyle('menu')]}
        >
          {field.options.map(option => (
            <Text key={option.value} modifiers={[tag(option.value)]}>
              {option.label}
            </Text>
          ))}
        </Picker>
      );
  }
}

/**
 * iOS: a native grouped form (SwiftUI `Form` in an `@expo/ui` Host) filling the screen.
 * Put it under a transparent navigation bar (ScreenHeader `scrollEdge`); the form's own
 * scroll view takes the bar and keyboard insets from UIKit's safe area.
 */
export function NativeForm({ sections }: { sections: FormSection[] }) {
  const theme = useAppTheme();

  return (
    <Host style={{ flex: 1 }}>
      <Form modifiers={[tint(theme.colors.primary), scrollDismissesKeyboard('interactively')]}>
        {sections.map(section => (
          <Section
            key={section.key}
            title={section.title}
            footer={
              section.error ? (
                <Text modifiers={[foregroundStyle(theme.colors.error)]}>{section.error}</Text>
              ) : section.footer ? (
                <Text>{section.footer}</Text>
              ) : undefined
            }
          >
            {section.fields.map(field => (
              <Field key={field.key} field={field} />
            ))}
          </Section>
        ))}
      </Form>
    </Host>
  );
}
