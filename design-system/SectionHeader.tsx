import { ReactNode, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from './ThemeContext';
import { Colors } from './themes';
import { hairline, space, typography } from './tokens';

interface SectionHeaderProps {
  title: string;
  right?: ReactNode;
}

/** 영역 머리말 + 아래 구분선. 영역마다 카드를 씌우는 대신 사용한다. */
export function SectionHeader({ title, right }: SectionHeaderProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {right}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: space[2],
    borderBottomWidth: hairline,
    borderBottomColor: colors.border.strong,
  },
  title: { ...typography.label, color: colors.text.secondary },
});
