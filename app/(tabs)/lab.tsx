import { Href, router } from 'expo-router';
import { FlaskConical } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getRegistry, setFeatureEnabled, useFeatureSettings } from '../../core/features';
import { useAuthStore } from '../../core/stores/auth.store';
import { useColors } from '../../design-system/ThemeContext';
import { Colors } from '../../design-system/themes';
import { radius, space, typography } from '../../design-system/tokens';

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
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { coupleId } = useAuthStore();
  const settings                  = useFeatureSettings(coupleId);
  const [toggling, setToggling]   = useState<string | null>(null);

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
                  <TouchableOpacity
                    style={styles.cardInfo}
                    activeOpacity={enabled && route ? 0.65 : 1}
                    onPress={() => enabled && route && router.push(route as Href)}
                    disabled={!enabled || !route}
                  >
                    <View style={styles.nameRow}>
                      <Text style={styles.featureName}>{feature.name}</Text>
                      {enabled && route && <Text style={styles.chevron}>›</Text>}
                    </View>
                    <Text style={styles.featureDesc}>{feature.description}</Text>
                  </TouchableOpacity>
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
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  safeArea:    { flex: 1, backgroundColor: colors.bg.base },
  header:      { paddingHorizontal: space[5], paddingTop: space[4], paddingBottom: space[3], gap: space[1] },
  title:       { ...typography.title1, color: colors.text.primary },
  subtitle:    { ...typography.caption, color: colors.text.secondary },

  body:        { padding: space[4], gap: space[2] },

  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], paddingTop: space[10] },
  emptyText:   { ...typography.body, color: colors.text.muted },

  card:        {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    gap: space[2],
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  cardOn:      { borderColor: colors.accent.primary + '66' },

  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  cardInfo:    { flex: 1, gap: 2 },
  nameRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  featureName: { ...typography.body, color: colors.text.primary },
  chevron:     { fontSize: 16, color: colors.accent.primary, lineHeight: 20 },
  featureDesc: { ...typography.tiny, color: colors.text.secondary },

});
