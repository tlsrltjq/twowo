import '../core/config/firebase';

import NetInfo from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';
import { useFonts } from 'expo-font';
import { Stack, useNavigationContainerRef } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { subscribeAuthState } from '../core/auth';
import { ensureUserDoc, getUserCoupleId, subscribeCouple } from '../core/couple';
import { ensurePermissionAndToken } from '../core/notifications';
import { useAuthStore } from '../core/stores/auth.store';
import { OfflineBanner } from '../design-system/OfflineBanner';

const routingInstrumentation = Sentry.reactNavigationIntegration();

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
  enabled: process.env.EXPO_PUBLIC_APP_ENV !== 'development',
  // EAS Build 시 @sentry/react-native/expo 플러그인이 SENTRY_RELEASE·SENTRY_DIST를 자동 주입.
  // dev 빌드는 enabled:false라 미설정 무해.
  ...(process.env.SENTRY_RELEASE ? { release: process.env.SENTRY_RELEASE } : {}),
  ...(process.env.SENTRY_DIST   ? { dist:    process.env.SENTRY_DIST }    : {}),
  integrations: [routingInstrumentation],
  tracesSampleRate: 0.2,
});

SplashScreen.preventAutoHideAsync();

// 시뮬레이터에서 isInternetReachable 오보 방지 — 실제 HTTP 응답으로 연결 판단
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

  // BR-D2: couples.status 구독 — disconnected 되면 coupleId null로 전환 → couple-connect로 이동
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
          // 알림 권한 요청 + Expo Push Token 저장 (BR-4/5 — 거부해도 크래시 없음)
          ensurePermissionAndToken(user.uid).catch(() => {});
        } else {
          setCoupleId(null);
        }
      } catch (e) {
        // Firestore 실패 시에도 로딩 해제 — 빈 coupleId로 화면 전환 허용
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} ref={ref}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(features)" />
        <Stack.Screen name="event/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="event/[id]" />
        <Stack.Screen name="event/edit/[id]" />
      </Stack>
      <OfflineBanner />
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
