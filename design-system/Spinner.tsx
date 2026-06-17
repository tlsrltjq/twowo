import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useColors } from './ThemeContext';

interface SpinnerProps {
  size?: 'small' | 'large';
  color?: string;
}

export function Spinner({ size = 'small', color }: SpinnerProps) {
  const colors = useColors();
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color ?? colors.accent.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
});
