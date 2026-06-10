import { Calendar, FlaskConical, Heart, Home, MessageCircle, Settings } from 'lucide-react-native';
import { router, Redirect, Tabs, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { subscribeUnreadCount } from '../../features/chat';
import { subscribeFeatureSettings } from '../../core/features';
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

const ALL_SIDEBAR_ITEMS: (SidebarItem & { featureId: string })[] = [
  { label: '데이트 빙고',     emoji: '🎯', route: '/(features)/bingo',         featureId: 'couple-bingo' },
  { label: '둘다좋아',        emoji: '💑', route: '/(features)/vote',           featureId: 'date-decision' },
  { label: '자기 전 한 마디', emoji: '🌙', route: '/(features)/night-message',   featureId: 'night-message' },
  { label: '칭찬 저금통',     emoji: '🫙', route: '/(features)/compliment-jar', featureId: 'compliment-jar' },
  { label: '오늘 뭐 먹었어', emoji: '🍽️', route: '/(features)/daily-food',    featureId: 'daily-food' },
];

export default function TabsLayout() {
  const { user, coupleId } = useAuthStore();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  // 채팅 읽음 배지
  const chatSeenAt = useRef(new Date());
  const [unreadChat, setUnreadChat]             = useState(0);
  const [featureSettings, setFeatureSettings]   = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!coupleId || !user) return;
    return subscribeUnreadCount(coupleId, user.uid, chatSeenAt.current, setUnreadChat);
  }, [coupleId, user?.uid]);

  useEffect(() => {
    if (!coupleId) return;
    return subscribeFeatureSettings(coupleId, setFeatureSettings);
  }, [coupleId]);

  useEffect(() => {
    if (pathname === '/chat') {
      chatSeenAt.current = new Date();
      setUnreadChat(0);
    }
  }, [pathname]);

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

  const enabledSidebarItems = ALL_SIDEBAR_ITEMS.filter(
    item => featureSettings[item.featureId] === true,
  );

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
              ...(unreadChat > 0 ? { tabBarBadge: Math.min(unreadChat, 9) } : {}),
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
            name="lab"
            options={{
              title: '실험실',
              tabBarIcon: ({ color, size }) => <FlaskConical size={size} color={color as string} strokeWidth={1.8} />,
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

              {enabledSidebarItems.length === 0 ? (
                <View style={styles.sidebarEmpty}>
                  <Text style={styles.sidebarEmptyText}>
                    실험실 탭에서 기능을 켜면{'\n'}여기에 나타나요
                  </Text>
                </View>
              ) : (
                enabledSidebarItems.map(item => (
                  <TouchableOpacity
                    key={item.route}
                    style={styles.sidebarItem}
                    onPress={() => handleSidebarItem(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sidebarEmoji}>{item.emoji}</Text>
                    <Text style={styles.sidebarItemLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))
              )}
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
  sidebarItemLabel:      { ...typography.body, color: colors.text.primary, flex: 1 },
  sidebarEmpty:          { paddingVertical: space[6], alignItems: 'center' },
  sidebarEmptyText:      { ...typography.caption, color: colors.text.muted, textAlign: 'center', lineHeight: 20 },
});
