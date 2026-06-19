import '../core/config/firebase';

import NetInfo from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';
import { useFonts } from 'expo-font';
import { Stack, useNavigationContainerRef } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { subscribeAuthState } from '../core/auth';
import { ensureUserDoc, getUserCoupleId, subscribeCouple } from '../core/couple';
import { ensurePermissionAndToken } from '../core/notifications';
import { useAuthStore } from '../core/stores/auth.store';
import { useThemeStore } from '../core/stores/theme.store';
import { ThemeProvider } from '../design-system/ThemeContext';
import { OfflineBanner } from '../design-system/OfflineBanner';

const routingInstrumentation = Sentry.reactNavigationIntegration();

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
  enabled: process.env.EXPO_PUBLIC_APP_ENV !== 'development',
  ...(process.env.SENTRY_RELEASE ? { release: process.env.SENTRY_RELEASE } : {}),
  ...(process.env.SENTRY_DIST   ? { dist:    process.env.SENTRY_DIST }    : {}),
  integrations: [routingInstrumentation],
  tracesSampleRate: 0.2,
});

SplashScreen.preventAutoHideAsync();

NetInfo.configure({
  reachabilityUrl: 'https://clients3.google.com/generate_204',
  reachabilityTest: async (response) => response.status === 204,
  reachabilityShortTimeout: 5000,
  reachabilityLongTimeout: 60000,
  reachabilityRequestTimeout: 5000,
});

function RootLayout() {
  const ref = useNavigationContainerRef();
  const [loaded] = useFonts({
    'Pretendard-Regular':  require('../assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium':   require('../assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('../assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold':     require('../assets/fonts/Pretendard-Bold.otf'),
  });

  const { coupleId, setUser, setCoupleId, setLoading } = useAuthStore();
  const isDark = useThemeStore(s => s.isDark);

  useEffect(() => {
    if (!coupleId) return;
    return subscribeCouple(coupleId, (couple) => {
      if (couple.status === 'disconnected') setCoupleId(null);
    });
  }, [coupleId, setCoupleId]);

  useEffect(() => {
    const unsub = subscribeAuthState(async (user) => {
      setLoading(true);
      setUser(user);
      try {
        if (user) {
          await ensureUserDoc(user.uid, user.displayName ?? '');
          const coupleId = await getUserCoupleId(user.uid);
          setCoupleId(coupleId);
          ensurePermissionAndToken(user.uid).catch(() => {});
        } else {
          setCoupleId(null);
        }
      } catch (e) {
        console.error('[auth] ensureUserDoc/getCoupleId failed:', e);
        if (user) setCoupleId(null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, [setUser, setCoupleId, setLoading]);

  useEffect(() => {
    if (ref) routingInstrumentation.registerNavigationContainer(ref);
  }, [ref]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }} ref={ref}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(features)" />
          <Stack.Screen name="event/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="event/[id]" />
          <Stack.Screen name="event/edit/[id]" />
          <Stack.Screen name="legal/[slug]" />
          <Stack.Screen name="danger-zone" />
        </Stack>
        <OfflineBanner />
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

export default Sentry.wrap(RootLayout);
