import { Calendar, Heart, Home, MessageCircle, Settings } from 'lucide-react-native';
import { router, Redirect, Tabs } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SidebarContext } from '../../core/sidebar.context';
import { useAuthStore } from '../../core/stores/auth.store';
import { colors, radius, space, typography } from '../../design-system/tokens';

const SIDEBAR_WIDTH = 280;

interface SidebarItem {
  label: string;
  emoji: string;
  route: string;
  comingSoon?: boolean;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { label: '데이트 빙고',  emoji: '🎯', route: '/(features)/bingo',     comingSoon: true },
  { label: '둘다좋아',     emoji: '💑', route: '/(features)/vote' },
];

export default function TabsLayout() {
  const { user, coupleId } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  if (!user) return <Redirect href="/(auth)/login" />;
  if (!coupleId) return <Redirect href="/(auth)/couple-connect" />;

  const openSidebar = () => {
    setSidebarOpen(true);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 240, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start();
  };

  const closeSidebar = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SIDEBAR_WIDTH, duration: 200, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setSidebarOpen(false));
  };

  const handleSidebarItem = (item: SidebarItem) => {
    if (item.comingSoon) return;
    closeSidebar();
    router.push(item.route as any);
  };

  return (
    <SidebarContext.Provider value={{ isOpen: sidebarOpen, open: openSidebar, close: closeSidebar }}>
      <View style={styles.root}>
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
            name="chat"
            options={{
              title: '채팅',
              tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color as string} strokeWidth={1.8} />,
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

        {/* Sidebar overlay */}
        {sidebarOpen && (
          <>
            <Animated.View
              style={[styles.backdrop, { opacity: backdropOpacity }]}
              pointerEvents="auto"
            >
              <Pressable style={StyleSheet.absoluteFill} onPress={closeSidebar} />
            </Animated.View>

            <Animated.View
              style={[
                styles.sidebar,
                { paddingTop: insets.top + space[3] },
                { transform: [{ translateX: slideAnim }] },
              ]}
            >
              <View style={styles.sidebarHeader}>
                <Text style={styles.sidebarTitle}>더 많은 기능</Text>
                <TouchableOpacity onPress={closeSidebar} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {SIDEBAR_ITEMS.map(item => (
                <TouchableOpacity
                  key={item.route}
                  style={[styles.sidebarItem, item.comingSoon && styles.sidebarItemDisabled]}
                  onPress={() => handleSidebarItem(item)}
                  activeOpacity={item.comingSoon ? 1 : 0.7}
                >
                  <Text style={styles.sidebarEmoji}>{item.emoji}</Text>
                  <View style={styles.sidebarItemText}>
                    <Text style={[styles.sidebarItemLabel, item.comingSoon && styles.sidebarItemLabelDisabled]}>
                      {item.label}
                    </Text>
                    {item.comingSoon && (
                      <Text style={styles.sidebarItemSub}>준비 중</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </Animated.View>
          </>
        )}
      </View>
    </SidebarContext.Provider>
  );
}

const styles = StyleSheet.create({
  root:                  { flex: 1 },

  backdrop:              {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
    zIndex: 10,
  },

  sidebar:               {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.bg.surface,
    zIndex: 11,
    paddingHorizontal: space[5],
    paddingBottom: space[8],
    gap: space[2],
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: -4, height: 0 },
    elevation: 12,
  },

  sidebarHeader:         {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: space[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    marginBottom: space[2],
  },
  sidebarTitle:          { ...typography.bodyBold, color: colors.text.primary },
  closeBtn:              { padding: space[2] },
  closeBtnText:          { ...typography.body, color: colors.text.muted },

  sidebarItem:           {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
    paddingVertical: space[4],
    paddingHorizontal: space[3],
    borderRadius: radius.md,
  },
  sidebarItemDisabled:   { opacity: 0.5 },
  sidebarEmoji:          { fontSize: 24, width: 32, textAlign: 'center' },
  sidebarItemText:       { flex: 1, gap: 2 },
  sidebarItemLabel:      { ...typography.body, color: colors.text.primary },
  sidebarItemLabelDisabled: { color: colors.text.secondary },
  sidebarItemSub:        { ...typography.tiny, color: colors.text.muted },
});
