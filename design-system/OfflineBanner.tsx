import NetInfo from '@react-native-community/netinfo';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from './ThemeContext';
import { Colors } from './themes';
import { space, typography } from './tokens';

export function OfflineBanner() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [isOffline, setIsOffline] = useState(false);
  const slideAnim = useRef(new Animated.Value(-80)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    return NetInfo.addEventListener(state => {
      if (state.isInternetReachable !== null) {
        setIsOffline(state.isInternetReachable === false);
      }
    });
  }, []);

  useEffect(() => {
    const height = 36 + insets.top;
    Animated.timing(slideAnim, {
      toValue: isOffline ? 0 : -height,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [isOffline, insets.top, slideAnim]);

  return (
    <Animated.View
      style={[styles.banner, { paddingTop: insets.top }, { transform: [{ translateY: slideAnim }] }]}
      pointerEvents="none"
    >
      <Text style={styles.text}>인터넷에 연결되어 있지 않아요</Text>
    </Animated.View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: colors.text.primary,
    paddingHorizontal: space[4],
    paddingBottom: space[2],
    alignItems: 'center',
  },
  text: {
    ...typography.tiny,
    color: colors.text.inverse,
  },
});
