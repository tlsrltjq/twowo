import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { ChevronLeft, Clock } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePartnerProfile } from '../../core/couple';
import { useAuthStore } from '../../core/stores/auth.store';
import { Skeleton } from '../../design-system/Skeleton';
import { Spinner } from '../../design-system/Spinner';
import { useColors } from '../../design-system/ThemeContext';
import { Colors } from '../../design-system/themes';
import { radius, space, typography } from '../../design-system/tokens';
import {
  addExtraPhoto,
  deleteFood,
  FoodLog,
  getFoodHistory,
  MEAL_EMOJI,
  MEAL_LABEL,
  MEAL_TYPES,
  MealType,
  setMealPhoto,
  subscribeTodayFood,
} from './index';

const SCREEN_W  = Dimensions.get('window').width;
const SLOT_SIZE = (SCREEN_W - space[4] * 2 - space[3]) / 2;

function formatDate(d: Date): string {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function formatHistoryDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

function groupByDate(logs: FoodLog[]): { date: string; logs: FoodLog[] }[] {
  const map = new Map<string, FoodLog[]>();
  logs.forEach(l => {
    const arr = map.get(l.date) ?? [];
    arr.push(l);
    map.set(l.date, arr);
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, logs]) => ({ date, logs }));
}

type ScreenMode = 'today' | 'history';

// ─── screen ───────────────────────────────────────────────────────────────────

export default function DailyFoodScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { user, coupleId }          = useAuthStore();
  const { partnerUid, partnerName } = usePartnerProfile(coupleId, user?.uid ?? null);

  const [logs, setLogs]           = useState<FoodLog[] | null>(null);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [mode, setMode]           = useState<ScreenMode>('today');
  const [history, setHistory]     = useState<FoodLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!coupleId) return;
    return subscribeTodayFood(coupleId, setLogs);
  }, [coupleId]);

  const loadHistory = useCallback(async () => {
    if (!coupleId) return;
    setHistoryLoading(true);
    try { setHistory(await getFoodHistory(coupleId)); }
    catch { /* ignore */ }
    finally { setHistoryLoading(false); }
  }, [coupleId]);

  useEffect(() => {
    if (mode === 'history') loadHistory();
  }, [mode, loadHistory]);

  const myLogs      = logs?.filter(l => l.userId === user?.uid)  ?? [];
  const partnerLogs = logs?.filter(l => l.userId === partnerUid) ?? [];

  // ── pick & upload ──────────────────────────────────────────────────────────

  const pickAndUpload = useCallback(async (
    mealType: MealType,
    source: 'camera' | 'gallery',
  ) => {
    if (!coupleId || !user) return;

    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('권한 필요', source === 'camera' ? '카메라 권한이 필요해요' : '사진 접근 권한이 필요해요');
      return;
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });

    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;

    const key = mealType === 'extra' ? `extra_${Date.now()}` : mealType;
    setUploading(prev => ({ ...prev, [key]: true }));
    try {
      if (mealType === 'extra') {
        await addExtraPhoto(coupleId, user.uid, uri);
      } else {
        await setMealPhoto(coupleId, user.uid, mealType, uri);
      }
    } catch {
      Alert.alert('오류', '사진 업로드에 실패했어요. 다시 시도해주세요');
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }));
    }
  }, [coupleId, user]);

  const handleSlotTap = useCallback((mealType: MealType, existing?: FoodLog) => {
    if (existing) {
      Alert.alert('사진 변경', '', [
        { text: '카메라로 다시 찍기', onPress: () => pickAndUpload(mealType, 'camera') },
        { text: '앨범에서 변경',      onPress: () => pickAndUpload(mealType, 'gallery') },
        {
          text: '삭제', style: 'destructive',
          onPress: () => Alert.alert('삭제', '이 식사 기록을 삭제할까요?', [
            { text: '취소', style: 'cancel' },
            { text: '삭제', style: 'destructive', onPress: () => deleteFood(existing.id) },
          ]),
        },
        { text: '취소', style: 'cancel' },
      ]);
    } else {
      Alert.alert('사진 선택', '', [
        { text: '카메라로 찍기', onPress: () => pickAndUpload(mealType, 'camera') },
        { text: '앨범에서 선택', onPress: () => pickAndUpload(mealType, 'gallery') },
        { text: '취소',         style: 'cancel' },
      ]);
    }
  }, [pickAndUpload]);

  const handleAddExtra = useCallback(() => {
    Alert.alert('추가 사진', '', [
      { text: '카메라로 찍기', onPress: () => pickAndUpload('extra', 'camera') },
      { text: '앨범에서 선택', onPress: () => pickAndUpload('extra', 'gallery') },
      { text: '취소',         style: 'cancel' },
    ]);
  }, [pickAndUpload]);

  const handleDeleteExtra = useCallback((log: FoodLog) => {
    Alert.alert('삭제', '이 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => deleteFood(log.id) },
    ]);
  }, []);

  // ── history ────────────────────────────────────────────────────────────────

  if (mode === 'history') {
    const byDate = groupByDate(history);
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setMode('today')} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ChevronLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>지난 밥 기록</Text>
          <View style={{ width: 36 }} />
        </View>
        {historyLoading ? (
          <View style={styles.center}><Spinner /></View>
        ) : byDate.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>🍽️</Text>
            <Text style={styles.emptyText}>아직 지난 기록이 없어요</Text>
          </View>
        ) : (
          <FlatList
            data={byDate}
            keyExtractor={({ date }) => date}
            contentContainerStyle={styles.historyList}
            renderItem={({ item: { date, logs: dayLogs } }) => (
              <HistoryDayCard
                date={date}
                logs={dayLogs}
                myUid={user?.uid ?? ''}
                partnerName={partnerName ?? '상대방'}
                styles={styles}
              />
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  // ── today ──────────────────────────────────────────────────────────────────

  const myFixed = MEAL_TYPES.map(t => myLogs.find(l => l.mealType === t) ?? null);
  const myExtra = myLogs.filter(l => l.mealType === 'extra');
  const pFixed  = MEAL_TYPES.map(t => partnerLogs.find(l => l.mealType === t) ?? null);
  const pExtra  = partnerLogs.filter(l => l.mealType === 'extra');

  return (
    <SafeAreaView testID="screen-daily-food" style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ChevronLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>오늘의 밥 🍚</Text>
        <TouchableOpacity onPress={() => setMode('history')} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="지난 기록">
          <Clock size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <Text
        testID={logs !== null ? 'daily-food-ready' : undefined}
        style={styles.dateLabel}
      >
        {formatDate(new Date())}
      </Text>

      <ScrollView contentContainerStyle={styles.body}>
        {/* 상대방 — 위 */}
        <Text style={styles.sectionLabel}>🍽️ {partnerName}의 오늘 밥</Text>
        {logs === null ? (
          <View style={styles.slotGrid}>
            {[0, 1, 2, 3].map(i => <Skeleton key={i} style={{ width: SLOT_SIZE, height: SLOT_SIZE, borderRadius: radius.xl }} />)}
          </View>
        ) : (
          <>
            <View style={styles.slotGrid}>
              {pFixed.map((log, i) => (
                <MealSlot
                  key={MEAL_TYPES[i]}
                  mealType={MEAL_TYPES[i]!}
                  log={log}
                  uploading={false}
                  readonly
                  styles={styles}
                />
              ))}
            </View>
            {pExtra.length > 0 && <ExtraRow logs={pExtra} onDelete={undefined} styles={styles} />}
          </>
        )}

        {/* 내 기록 — 아래 */}
        <Text style={[styles.sectionLabel, { marginTop: space[6] }]}>✏️ 내 오늘 밥</Text>
        {logs === null ? (
          <View style={styles.slotGrid}>
            {[0, 1, 2, 3].map(i => <Skeleton key={i} style={{ width: SLOT_SIZE, height: SLOT_SIZE, borderRadius: radius.xl }} />)}
          </View>
        ) : (
          <>
            <View style={styles.slotGrid}>
              {myFixed.map((log, i) => (
                <MealSlot
                  key={MEAL_TYPES[i]}
                  mealType={MEAL_TYPES[i]!}
                  log={log}
                  uploading={!!uploading[MEAL_TYPES[i]!]}
                  readonly={false}
                  onTap={() => handleSlotTap(MEAL_TYPES[i]!, log ?? undefined)}
                  styles={styles}
                />
              ))}
            </View>
            <ExtraRow logs={myExtra} onDelete={handleDeleteExtra} styles={styles} />
            <TouchableOpacity testID="fab-food" style={styles.addBtn} onPress={handleAddExtra}>
              <Text style={styles.addBtnText}>+ 추가</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── meal slot ────────────────────────────────────────────────────────────────

type StylesType = ReturnType<typeof makeStyles>;

function MealSlot({
  mealType, log, uploading, readonly, onTap, styles,
}: {
  mealType: MealType;
  log: FoodLog | null;
  uploading: boolean;
  readonly: boolean;
  onTap?: () => void;
  styles: StylesType;
}) {
  const hasPhoto = !!log?.photoUrl;
  return (
    <TouchableOpacity
      style={[styles.slot, { height: SLOT_SIZE }, !hasPhoto && styles.slotEmpty]}
      onPress={readonly ? undefined : onTap}
      activeOpacity={readonly ? 1 : 0.8}
      disabled={readonly || uploading}
    >
      {uploading ? (
        <ActivityIndicator />
      ) : hasPhoto ? (
        <Image source={{ uri: log!.photoUrl! }} style={styles.slotImage} resizeMode="cover" />
      ) : (
        <>
          <Text style={styles.slotEmoji}>{MEAL_EMOJI[mealType]}</Text>
          <Text style={styles.slotLabel}>{MEAL_LABEL[mealType]}</Text>
          <Text style={styles.slotHint}>{readonly ? '안먹음' : '안먹음'}</Text>
        </>
      )}
      {hasPhoto && (
        <View style={styles.slotOverlay}>
          <Text style={styles.slotOverlayText}>{MEAL_LABEL[mealType]}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── extra row ────────────────────────────────────────────────────────────────

function ExtraRow({
  logs, onDelete, styles,
}: {
  logs: FoodLog[];
  onDelete: ((log: FoodLog) => void) | undefined;
  styles: StylesType;
}) {
  if (logs.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.extraScroll} contentContainerStyle={styles.extraContent}>
      {logs.map(log => (
        <TouchableOpacity
          key={log.id}
          style={styles.extraThumb}
          onLongPress={onDelete ? () => onDelete(log) : undefined}
          delayLongPress={400}
        >
          {log.photoUrl ? (
            <Image source={{ uri: log.photoUrl }} style={styles.extraThumbImage} resizeMode="cover" />
          ) : (
            <Text style={{ fontSize: 24 }}>{MEAL_EMOJI.extra}</Text>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─── history day card ─────────────────────────────────────────────────────────

function HistoryDayCard({
  date, logs, myUid, partnerName, styles,
}: {
  date: string;
  logs: FoodLog[];
  myUid: string;
  partnerName: string;
  styles: StylesType;
}) {
  const myLogs      = logs.filter(l => l.userId === myUid);
  const partnerLogs = logs.filter(l => l.userId !== myUid);

  return (
    <View style={styles.historyCard}>
      <Text style={styles.historyDate}>{formatHistoryDate(date)}</Text>
      {([
        { label: partnerName, list: partnerLogs },
        { label: '나',        list: myLogs },
      ] as const).map(({ label, list }) => list.length > 0 && (
        <View key={label} style={styles.historyPerson}>
          <Text style={styles.historyPersonLabel}>{label}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyPhotos}>
            {list.map(log => (
              <View key={log.id} style={styles.historyThumb}>
                {log.photoUrl ? (
                  <Image source={{ uri: log.photoUrl }} style={styles.historyThumbImage} resizeMode="cover" />
                ) : (
                  <Text style={{ fontSize: 20 }}>{MEAL_EMOJI[log.mealType]}</Text>
                )}
                <Text style={styles.historyThumbLabel}>{MEAL_LABEL[log.mealType]}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      ))}
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const makeStyles = (colors: Colors) => StyleSheet.create({
  safeArea:   { flex: 1, backgroundColor: colors.bg.base },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3] },

  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], paddingVertical: space[4], borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  backBtn:    { padding: space[1], width: 36 },
  headerTitle:{ ...typography.title2, color: colors.text.primary, flex: 1, textAlign: 'center' },
  iconBtn:    { padding: space[2], width: 36, alignItems: 'flex-end' },

  dateLabel:  { ...typography.caption, color: colors.text.muted, textAlign: 'center', paddingVertical: space[2], backgroundColor: colors.bg.surface, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },

  body:       { padding: space[4], gap: space[3], paddingBottom: space[10] },
  sectionLabel: { ...typography.caption, color: colors.text.muted, fontFamily: 'Pretendard-SemiBold', letterSpacing: 0.5 },

  slotGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  slot:       { width: SLOT_SIZE, borderRadius: radius.xl, backgroundColor: colors.bg.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  slotEmpty:  { borderWidth: 1.5, borderColor: colors.border.subtle, borderStyle: 'dashed', gap: 4 },
  slotImage:  { width: '100%', height: '100%' },
  slotEmoji:  { fontSize: 28 },
  slotLabel:  { ...typography.bodyBold, color: colors.text.secondary },
  slotHint:   { ...typography.tiny, color: colors.text.muted, textAlign: 'center' },
  slotOverlay:      { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.35)', paddingVertical: 4, alignItems: 'center' },
  slotOverlayText:  { ...typography.tiny, color: '#fff', fontFamily: 'Pretendard-SemiBold' },

  extraScroll:     { marginTop: space[2] },
  extraContent:    { gap: space[2], paddingVertical: space[1] },
  extraThumb:      { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.bg.surface, borderWidth: 1, borderColor: colors.border.subtle, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  extraThumbImage: { width: '100%', height: '100%' },

  addBtn:     { marginTop: space[2], paddingVertical: space[3], alignItems: 'center', borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border.subtle, borderStyle: 'dashed' },
  addBtnText: { ...typography.body, color: colors.accent.primary },

  emptyIcon:  { fontSize: 36 },
  emptyText:  { ...typography.bodyBold, color: colors.text.muted },

  historyList:        { padding: space[4], gap: space[4], paddingBottom: space[8] },
  historyCard:        { backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[4], gap: space[3], borderWidth: 1, borderColor: colors.border.subtle },
  historyDate:        { ...typography.bodyBold, color: colors.text.primary },
  historyPerson:      { gap: space[2] },
  historyPersonLabel: { ...typography.tiny, color: colors.text.muted },
  historyPhotos:      { gap: space[2] },
  historyThumb:       { alignItems: 'center', gap: 4 },
  historyThumbImage:  { width: 64, height: 64, borderRadius: radius.md },
  historyThumbLabel:  { ...typography.tiny, color: colors.text.muted },
});
