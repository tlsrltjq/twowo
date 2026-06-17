import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useColors } from './ThemeContext';
import { Colors } from './themes';
import { radius, shadow, space } from './tokens';

interface CardProps {
  children: React.ReactNode;
  padding?: keyof typeof space;
  variant?: 'plain' | 'elevated';
  onPress?: () => void;
}

export function Card({ children, padding = 4, variant = 'plain', onPress }: CardProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const style = [
    styles.base,
    { padding: space[padding] },
    variant === 'elevated' && shadow.sm,
  ];

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [...style, pressed && styles.pressed]}>
        {children}
      </Pressable>
    );
  }
  return <View style={style}>{children}</View>;
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  base: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  pressed: { opacity: 0.9 },
});
