import { Tabs } from 'expo-router';

import { colors } from '../../design-system/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent.primary,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: { backgroundColor: colors.bg.surface, borderTopColor: colors.border.subtle },
      }}
    >
      <Tabs.Screen name="index" options={{ title: '홈' }} />
    </Tabs>
  );
}
