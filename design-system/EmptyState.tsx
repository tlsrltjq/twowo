import { ComponentType, ReactElement, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { useColors } from './ThemeContext';
import { Colors } from './themes';
import { space, typography } from './tokens';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
  illustration?: ReactElement | ComponentType;
}

export function EmptyState({ title, description, action, illustration }: EmptyStateProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const Illus = illustration && typeof illustration === 'function' ? illustration : null;

  return (
    <View style={styles.container}>
      {illustration && typeof illustration !== 'function' && illustration}
      {Illus && <Illus />}
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {action && (
        <Button label={action.label} onPress={action.onPress} variant="secondary" size="sm" />
      )}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[8],
    gap: space[3],
  },
  title: { ...typography.title2, color: colors.text.primary, textAlign: 'center' },
  description: { ...typography.body, color: colors.text.secondary, textAlign: 'center' },
});
