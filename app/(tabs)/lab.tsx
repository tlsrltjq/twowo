import { Href, router } from 'expo-router';
import { FlaskConical } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getRegistry, setFeatureEnabled, subscribeFeatureSettings } from '../../core/features';
import { useAuthStore } from '../../core/stores/auth.store';
import { colors, radius, space, typography } from '../../design-system/tokens';

const FEATURE_ROUTES: Record<string, string> = {
  'couple-bingo':    '/(features)/bingo',
  'date-decision':   '/(features)/vote',
  'night-message':   '/(features)/night-message',
  'compliment-jar':  '/(features)/compliment-jar',
  'daily-food':      '/(features)/daily-food',
  'first-moments':   '/(features)/first-moments',
  'gift-wishlist':   '/(features)/gift-wishlist',
  'daily-gratitude': '/(features)/daily-gratitude',
  'our-playlist':    '/(features)/our-playlist',
};

const experimentalFeatures = getRegistry().filter(f => f.status === 'experimental');

export default function LabScreen() {
  const { coupleId } = useAuthStore();
  const [settings, setSettings]   = useState<Record<string, boolean>>({});
  const [toggling, setToggling]   = useState<string | null>(null);

  useEffect(() => {
    if (!coupleId) return;
    return subscribeFeatureSettings(coupleId, setSettings);
  }, [coupleId]);

  const handleToggle = async (featureId: string, value: boolean) => {
    if (!coupleId || toggling) return;
    setToggling(featureId);
    try {
      await setFeatureEnabled(coupleId, featureId, value);
    } catch {
      Alert.alert('오류', '기능 설정을 저장하지 못했어요. 다시 시도해주세요');
    } finally {
      setToggling(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>실험실</Text>
        <Text style={styles.subtitle}>커플만의 기능을 골라서 켜보세요 — 한쪽이 켜면 양쪽에 반영돼요</Text>
      </View>

      <ScrollView testID="scroll-lab" contentContainerStyle={styles.body}>
        {experimentalFeatures.length === 0 ? (
          <View style={styles.empty}>
            <FlaskConical size={40} color={colors.text.muted} strokeWidth={1.5} />
            <Text style={styles.emptyText}>준비 중인 기능이 없어요</Text>
          </View>
        ) : (
          experimentalFeatures.map(feature => {
            const enabled  = settings[feature.id] ?? false;
            const route    = FEATURE_ROUTES[feature.id];
            const isBusy   = toggling === feature.id;

            return (
              <View key={feature.id} style={[styles.card, enabled && styles.cardOn]}>
                <View style={styles.cardTop}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.featureName}>{feature.name}</Text>
                    <Text style={styles.featureDesc}>{feature.description}</Text>
                  </View>
                  <Switch
                    testID={`switch-${feature.id}`}
                    value={enabled}
                    onValueChange={v => handleToggle(feature.id, v)}
                    disabled={isBusy}
                    trackColor={{ false: colors.border.subtle, true: colors.accent.primary }}
                    thumbColor={colors.bg.surface}
                    ios_backgroundColor={colors.border.subtle}
                  />
                </View>

                {enabled && route && (
                  <TouchableOpacity
                    style={styles.openBtn}
                    onPress={() => router.push(route as Href)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.openBtnText}>화면 열기 →</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:    { flex: 1, backgroundColor: colors.bg.base },
  header:      { paddingHorizontal: space[5], paddingTop: space[4], paddingBottom: space[3], gap: space[1] },
  title:       { ...typography.title1, color: colors.text.primary },
  subtitle:    { ...typography.caption, color: colors.text.secondary },

  body:        { padding: space[4], gap: space[3] },

  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], paddingTop: space[10] },
  emptyText:   { ...typography.body, color: colors.text.muted },

  card:        {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: space[4],
    gap: space[3],
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  cardOn:      { borderColor: colors.accent.primary + '66' },

  cardTop:     { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  cardInfo:    { flex: 1, gap: space[1] },
  featureName: { ...typography.bodyBold, color: colors.text.primary },
  featureDesc: { ...typography.caption, color: colors.text.secondary },

  openBtn:     {
    alignSelf: 'flex-end',
    paddingVertical: space[2],
    paddingHorizontal: space[4],
    backgroundColor: colors.accent.primary,
    borderRadius: radius.pill,
  },
  openBtnText: { ...typography.caption, color: colors.text.inverse, fontFamily: 'Pretendard-SemiBold' },
});

