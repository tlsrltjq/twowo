import { Href, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getRegistry, setFeatureEnabled, useFeatureSettings } from '../../core/features';
import { useAuthStore } from '../../core/stores/auth.store';
import { EmptyState } from '../../design-system/EmptyState';
import { useColors } from '../../design-system/ThemeContext';
import { Colors } from '../../design-system/themes';
import { hairline, space, typography } from '../../design-system/tokens';

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
      Alert.alert('저장하지 못했어요', '잠시 후 다시 시도해 주세요.');
    } finally {
      setToggling(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>실험실</Text>
        <Text style={styles.subtitle}>한 사람이 켜면 둘 다에게 보여요</Text>
      </View>

      <ScrollView testID="scroll-lab" contentContainerStyle={styles.body}>
        {experimentalFeatures.length === 0 ? (
          <EmptyState title="지금은 켤 수 있는 기능이 없어요" />
        ) : (
          experimentalFeatures.map(feature => {
            const enabled  = settings[feature.id] ?? false;
            const route    = FEATURE_ROUTES[feature.id];
            const isBusy   = toggling === feature.id;

            return (
              <View key={feature.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <TouchableOpacity
                    style={styles.cardInfo}
                    activeOpacity={enabled && route ? 0.65 : 1}
                    onPress={() => enabled && route && router.push(route as Href)}
                    disabled={!enabled || !route}
                  >
                    <View style={styles.nameRow}>
                      <Text style={styles.featureName}>{feature.name}</Text>
                      {enabled && route && <Text style={styles.openLink}>열기</Text>}
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
  header:      { paddingHorizontal: space[5], paddingTop: space[4], paddingBottom: space[4], gap: space[1], borderBottomWidth: hairline, borderBottomColor: colors.border.strong },
  title:       { ...typography.title1, color: colors.text.primary },
  subtitle:    { ...typography.caption, color: colors.text.secondary },

  body:        { paddingHorizontal: space[5], paddingBottom: space[10] },

  card:        {
    paddingVertical: space[4],
    borderBottomWidth: hairline,
    borderBottomColor: colors.border.subtle,
  },

  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  cardInfo:    { flex: 1, gap: space[1] },
  nameRow:     { flexDirection: 'row', alignItems: 'baseline', gap: space[2] },
  featureName: { ...typography.body, color: colors.text.primary },
  openLink:    { ...typography.caption, color: colors.accent.primary },
  featureDesc: { ...typography.caption, color: colors.text.secondary },
});
