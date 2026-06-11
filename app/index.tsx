import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { useAuthStore } from '../core/stores/auth.store';
import { Spinner } from '../design-system/Spinner';
import { colors } from '../design-system/tokens';

export default function Index() {
  const { user, coupleId, loading } = useAuthStore();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg.base, alignItems: 'center', justifyContent: 'center' }}>
        <Spinner />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/login" />;
  if (!coupleId) return <Redirect href="/(auth)/couple-connect" />;
  return <Redirect href="/(tabs)" />;
}
