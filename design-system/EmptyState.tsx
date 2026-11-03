import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { useColors } from './ThemeContext';
import { Colors } from './themes';
import { space, typography } from './tokens';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
}

/** 빈 상태·오류 안내. 그림 없이 짧은 문장 두 줄로만 알린다. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {action && (
        <View style={styles.action}>
          <Button label={action.label} onPress={action.onPress} variant="secondary" size="sm" />
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    paddingVertical: space[8],
    paddingHorizontal: space[1],
    gap: space[1],
  },
  title: { ...typography.body, color: colors.text.secondary },
  description: { ...typography.caption, color: colors.text.muted },
  action: { alignSelf: 'flex-start', marginTop: space[3] },
});
