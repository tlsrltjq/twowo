import '../core/config/firebase';

import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { subscribeAuthState } from '../core/auth';
import { ensureUserDoc, getUserCoupleId } from '../core/couple';
import { useAuthStore } from '../core/stores/auth.store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    'Pretendard-Regular':  require('../assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium':   require('../assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('../assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold':     require('../assets/fonts/Pretendard-Bold.otf'),
  });

  const { setUser, setCoupleId, setLoading } = useAuthStore();

  useEffect(() => {
    const unsub = subscribeAuthState(async (user) => {
      setLoading(true);
      setUser(user);
      if (user) {
        await ensureUserDoc(user.uid, user.displayName ?? '');
        const coupleId = await getUserCoupleId(user.uid);
        setCoupleId(coupleId);
      } else {
        setCoupleId(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [setUser, setCoupleId, setLoading]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
