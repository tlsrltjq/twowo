import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { useColors } from './ThemeContext';
import { Colors } from './themes';
import { radius, space, typography } from './tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

const sizeStyle = {
  sm: { paddingVertical: space[2], paddingHorizontal: space[4], ...typography.caption },
  md: { paddingVertical: space[3], paddingHorizontal: space[6], ...typography.button },
  lg: { paddingVertical: space[4], paddingHorizontal: space[8], ...typography.button },
} as const;

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const variantStyle = {
    primary:   { bg: colors.accent.primary,  text: colors.text.inverse,   border: 'transparent' },
    secondary: { bg: colors.bg.surface,      text: colors.text.primary,   border: colors.border.strong },
    ghost:     { bg: 'transparent',          text: colors.accent.primary,  border: 'transparent' },
    danger:    { bg: colors.status.danger,   text: colors.text.inverse,   border: 'transparent' },
  };

  const v = variantStyle[variant];
  const s = sizeStyle[size];

  const handlePress = () => {
    Haptics.selectionAsync();
    onPress();
  };

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      disabled={disabled || loading}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: v.bg, borderColor: v.border, paddingVertical: s.paddingVertical, paddingHorizontal: s.paddingHorizontal },
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <Text style={[{ color: v.text, fontSize: s.fontSize, lineHeight: s.lineHeight, fontWeight: s.fontWeight }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const makeStyles = (_colors: Colors) => StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  pressed:  { opacity: 0.8 },
});
