import { StyleSheet, Text, View } from 'react-native';

import { colors, space, typography } from '../../design-system/tokens';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>홈</Text>
      <Text style={styles.subtitle}>4단계에서 구현 예정</Text>
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
  title:    { ...typography.title1, color: colors.text.primary },
  subtitle: { ...typography.body, color: colors.text.secondary, marginTop: space[2] },
});
