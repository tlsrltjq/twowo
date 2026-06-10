import { Calendar, Heart, Home, Settings } from 'lucide-react-native';
import { Redirect, Tabs } from 'expo-router';

import { useAuthStore } from '../../core/stores/auth.store';
import { colors } from '../../design-system/tokens';

export default function TabsLayout() {
  const { user, coupleId } = useAuthStore();

  if (!user) return <Redirect href="/(auth)/login" />;
  if (!coupleId) return <Redirect href="/(auth)/couple-connect" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent.primary,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: {
          backgroundColor: colors.bg.surface,
          borderTopColor: colors.border.subtle,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color as string} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: '캘린더',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color as string} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="mood"
        options={{
          title: '컨디션',
          tabBarIcon: ({ color, size }) => <Heart size={size} color={color as string} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color as string} strokeWidth={1.8} />,
        }}
      />
    </Tabs>
  );
}
