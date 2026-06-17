import { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

import { useColors } from './ThemeContext';
import { Colors } from './themes';
import { radius, shadow, space, typography } from './tokens';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  onHide: () => void;
}

export function Toast({ message, type = 'info', visible, onHide }: ToastProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const opacity = useRef(new Animated.Value(0)).current;

  const typeColor = type === 'success'
    ? colors.status.success
    : type === 'error'
      ? colors.status.danger
      : colors.text.secondary;

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      const timer = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => onHide());
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [visible, onHide, opacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { borderLeftColor: typeColor, opacity }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: space[12],
    left: space[4],
    right: space[4],
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    padding: space[4],
    ...shadow.md,
  },
  text: { ...typography.body, color: colors.text.primary },
});
