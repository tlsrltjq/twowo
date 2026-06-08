import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, space, typography } from './tokens';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  error?: string | undefined;
  multiline?: boolean;
  maxLength?: number;
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words';
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  multiline,
  maxLength,
  keyboardType = 'default',
  secureTextEntry,
  autoCapitalize = 'sentences',
}: TextFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.muted}
        multiline={multiline}
        maxLength={maxLength}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        style={[styles.input, error ? styles.inputError : undefined]}
      />
      <View style={styles.footer}>
        {error ? <Text style={styles.errorText}>{error}</Text> : <View />}
        {maxLength !== undefined && (
          <Text style={styles.counter}>{value.length}/{maxLength}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: space[1] },
  label: { ...typography.caption, color: colors.text.secondary },
  input: {
    borderWidth: 1,
    borderColor: colors.border.strong,
    borderRadius: radius.md,
    padding: space[3],
    ...typography.body,
    color: colors.text.primary,
    backgroundColor: colors.bg.surface,
  },
  inputError: { borderColor: colors.status.danger },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  errorText: { ...typography.tiny, color: colors.status.danger },
  counter: { ...typography.tiny, color: colors.text.muted },
});
