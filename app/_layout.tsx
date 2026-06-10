import '../core/config/firebase';

import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { subscribeAuthState } from '../core/auth';
import { ensureUserDoc, getUserCoupleId, subscribeCouple } from '../core/couple';
import { ensurePermissionAndToken } from '../core/notifications';
import { useAuthStore } from '../core/stores/auth.store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(features)" />
        <Stack.Screen name="event/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="event/[id]" />
        <Stack.Screen name="event/edit/[id]" />
      </Stack>
    </GestureHandlerRootView>
  );
}
