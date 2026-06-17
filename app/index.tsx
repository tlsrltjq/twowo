import { Redirect } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAuthStore } from '../core/stores/auth.store';
import { Spinner } from '../design-system/Spinner';
import { useColors } from '../design-system/ThemeContext';
import { Colors } from '../design-system/themes';

export default function Index() {
  const { user, coupleId, loading } = useAuthStore();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Spinner />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/login" />;
  if (!coupleId) return <Redirect href="/(auth)/couple-connect" />;
  return <Redirect href="/(tabs)" />;
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg.base, alignItems: 'center', justifyContent: 'center' },
});
