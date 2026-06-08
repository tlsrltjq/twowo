import { View, Text, StyleSheet } from 'react-native';

import { colors, typography, space } from '../../design-system/tokens';

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>둘다좋아</Text>
      <Text style={styles.subtitle}>1단계에서 구현 예정</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[6],
  },
  title: { ...typography.display, color: colors.text.primary },
  subtitle: { ...typography.body, color: colors.text.secondary, marginTop: space[2] },
});
