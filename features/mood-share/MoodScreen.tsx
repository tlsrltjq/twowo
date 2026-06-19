import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView, StyleSheet, Switch, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { subscribeCouple } from '../../core/couple';
import { useAuthStore } from '../../core/stores/auth.store';
import { addDays, getTodayKST, toLocalYMD } from '../../core/utils/date';
import { Button } from '../../design-system/Button';
import { Spinner } from '../../design-system/Spinner';
import { Toast } from '../../design-system/Toast';
import { useColors } from '../../design-system/ThemeContext';
import { Colors } from '../../design-system/themes';
import { black, radius, space, typography } from '../../design-system/tokens';
import {
  getRecent7Days,
  getTodayMood,
  setTodayMood,
  subscribePartnerMoodToday,
} from './index';
import { Mood, MoodCheck, MoodLockedError } from './schema';

const ENERGY_EMOJIS = ['', '😴', '😑', '🙂', '😊', '🔥'] as const;
const MOOD_LABELS: Record<Mood, string> = {
  great: '최고 🌟',
  good:  '좋아 😊',
  okay:  '보통 😐',
  bad:   '별로 😔',
};
const DOW_SHORT = ['일', '월', '화', '수', '목', '금', '토'];

type ToastState = { message: string; type: 'success' | 'error' | 'info'; visible: boolean };

// ── 오늘 미니 카드 ─────────────────────────────────────────────
function TodayCard({
  label, check, moodColors, styles,
}: {
  label: string;
  check: MoodCheck | null;
  moodColors: Record<Mood, string>;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.todayCard}>
      <Text style={styles.todayCardLabel}>{label}</Text>
      {check ? (
        <>
          <Text style={styles.todayCardEnergy}>{ENERGY_EMOJIS[check.energy]}</Text>
          <View style={[styles.todayMoodBadge, { backgroundColor: moodColors[check.mood] }]}>
            <Text style={styles.todayMoodBadgeText}>{MOOD_LABELS[check.mood]}</Text>
          </View>
          <Text style={styles.todayMeet}>{check.canMeet ? '✅ 만남 가능' : '❌ 어려워요'}</Text>
          {check.memo ? <Text style={styles.todayMemo} numberOfLines={2}>"{check.memo}"</Text> : null}
        </>
      ) : (
        <Text style={styles.todayEmpty}>아직 입력 전 💭</Text>
      )}
    </View>
  );
}

// ── 하루 컬럼 (7일 차트) ──────────────────────────────────────
function DayColumn({
  date, myCheck, partnerCheck, moodColors, isToday, styles,
}: {
  date: string;
  myCheck?: MoodCheck;
  partnerCheck?: MoodCheck;
  moodColors: Record<Mood, string>;
  isToday: boolean;
  styles: ReturnType<typeof makeStyles>;
}) {
  const d = new Date(date + 'T12:00:00');
  return (
    <View style={[styles.dayCol, isToday && styles.dayColToday]}>
      {/* 나 버블 */}
      <View style={[
        styles.bubble,
        myCheck
          ? { backgroundColor: moodColors[myCheck.mood] + 'BB' }
          : styles.bubbleEmpty,
      ]}>
        <Text style={styles.bubbleEmoji}>{myCheck ? ENERGY_EMOJIS[myCheck.energy] : ''}</Text>
      </View>
      {/* 상대방 버블 */}
      <View style={[
        styles.bubble,
        partnerCheck
          ? { backgroundColor: moodColors[partnerCheck.mood] + '55' }
          : styles.bubbleEmpty,
      ]}>
        <Text style={styles.bubbleEmoji}>{partnerCheck ? ENERGY_EMOJIS[partnerCheck.energy] : ''}</Text>
      </View>
      {/* 날짜 */}
      <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
        {isToday ? '오늘' : DOW_SHORT[d.getDay()]}
      </Text>
      <Text style={styles.dayDateLabel}>{d.getMonth() + 1}/{d.getDate()}</Text>
    </View>
  );
}

// ── 메인 ──────────────────────────────────────────────────────
export default function MoodScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const MOOD_COLORS: Record<Mood, string> = useMemo(() => ({
    great: colors.status.success,
    good:  colors.accent.primary,
    okay:  colors.accent.warm,
    bad:   colors.status.danger,
  }), [colors]);

  const { user, coupleId } = useAuthStore();
  const [myMood, setMyMood]                   = useState<MoodCheck | null>(null);
  const [partnerMood, setPartnerMood]         = useState<MoodCheck | null>(null);
  const [history, setHistory]                 = useState<MoodCheck[]>([]);
  const [partnerHistory, setPartnerHistory]   = useState<MoodCheck[]>([]);
  const [partnerUid, setPartnerUid]           = useState<string | null>(null);
  const [loading, setLoading]                 = useState(true);

  const [energy, setEnergy]   = useState<1|2|3|4|5>(3);
  const [mood, setMood]       = useState<Mood>('good');
  const [canMeet, setCanMeet] = useState(true);
  const [memo, setMemo]       = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);

  const [toast, setToast] = useState<ToastState>({ message: '', type: 'success', visible: false });
  const show = (message: string, type: ToastState['type']) =>
    setToast({ message, type, visible: true });

  const unsubPartnerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!user || !coupleId) return;

    (async () => {
      try {
        const [todayMy, hist] = await Promise.all([
          getTodayMood(coupleId, user.uid),
          getRecent7Days(coupleId, user.uid),
        ]);
        setMyMood(todayMy);
        setHistory(hist);
        if (todayMy) {
          setEnergy(todayMy.energy as 1|2|3|4|5);
          setMood(todayMy.mood);
          setCanMeet(todayMy.canMeet);
          setMemo(todayMy.memo ?? '');
        }
      } finally {
        setLoading(false);
      }
    })();

    const unsubCouple = subscribeCouple(coupleId, (couple) => {
      const pid = (couple.memberIds as string[]).find(id => id !== user.uid) ?? null;
      setPartnerUid(pid);
      unsubPartnerRef.current?.();
      if (pid) {
        unsubPartnerRef.current = subscribePartnerMoodToday(coupleId, pid, setPartnerMood);
      }
    });

    return () => { unsubCouple(); unsubPartnerRef.current?.(); };
  }, [user, coupleId]);

  // 파트너 7일 히스토리
  useEffect(() => {
    if (!partnerUid || !coupleId) return;
    getRecent7Days(coupleId, partnerUid).then(setPartnerHistory).catch(console.error);
  }, [partnerUid, coupleId]);

  const handleSave = useCallback(async () => {
    if (!user || !coupleId || saving) return;
    setSaving(true);
    try {
      const result = await setTodayMood({ coupleId, userId: user.uid, energy, mood, canMeet, memo: memo || undefined });
      setMyMood(result);
      setEditing(false);
      show('컨디션이 저장됐어요 ✅', 'success');
      const hist = await getRecent7Days(coupleId, user.uid);
      setHistory(hist);
    } catch (e) {
      if (e instanceof MoodLockedError) show('오늘 컨디션은 이미 잠겼습니다', 'error');
      else show('저장에 실패했어요', 'error');
    } finally {
      setSaving(false);
    }
  }, [user, coupleId, energy, mood, canMeet, memo, saving]);

  const last7Days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => toLocalYMD(addDays(new Date(), -(6 - i)))),
    [],
  );

  const myHistMap      = useMemo(() => Object.fromEntries(history.map(h => [h.date, h])), [history]);
  const partnerHistMap = useMemo(() => Object.fromEntries(partnerHistory.map(h => [h.date, h])), [partnerHistory]);

  const todayKST = getTodayKST();
  const showForm = !myMood || editing;

  if (!coupleId) return <Spinner />;
  if (loading)   return <Spinner />;

  return (
    <SafeAreaView testID="screen-mood" style={styles.safeArea} edges={['top']}>
    <ScrollView style={styles.container} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

      {/* 헤더 */}
      <View style={styles.pageHeader}>
        <Text style={styles.screenTitle}>오늘의 컨디션</Text>
        {myMood && !editing && myMood.date === todayKST && (
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Text style={styles.editLink}>수정</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── 오늘 나 / 상대방 나란히 (저장 후) ── */}
      {!showForm && (
        <View style={styles.todayRow}>
          <TodayCard label="나" check={myMood} moodColors={MOOD_COLORS} styles={styles} />
          <TodayCard label="상대방" check={partnerMood} moodColors={MOOD_COLORS} styles={styles} />
        </View>
      )}

      {/* ── 7일 비교 차트 ── */}
      {(history.length > 0 || partnerHistory.length > 0) && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>7일 비교</Text>
          <View style={styles.chartRow}>
            {last7Days.map(date => (
              <DayColumn
                key={date}
                date={date}
                {...(myHistMap[date] !== undefined ? { myCheck: myHistMap[date] } : {})}
                {...(partnerHistMap[date] !== undefined ? { partnerCheck: partnerHistMap[date] } : {})}
                moodColors={MOOD_COLORS}
                isToday={date === todayKST}
                styles={styles}
              />
            ))}
          </View>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: MOOD_COLORS.good + 'BB' }]} />
              <Text style={styles.legendText}>나</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: MOOD_COLORS.good + '55' }]} />
              <Text style={styles.legendText}>상대방</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── 폼 중일 때 상대방 오늘 컨디션 ── */}
      {showForm && partnerMood && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>상대방 컨디션</Text>
          <View style={styles.partnerInlineRow}>
            <Text style={styles.partnerEnergy}>{ENERGY_EMOJIS[partnerMood.energy]}</Text>
            <View style={[styles.todayMoodBadge, { backgroundColor: MOOD_COLORS[partnerMood.mood] }]}>
              <Text style={styles.todayMoodBadgeText}>{MOOD_LABELS[partnerMood.mood]}</Text>
            </View>
            <Text style={styles.todayMeet}>{partnerMood.canMeet ? '✅ 만남 가능' : '❌ 어려워요'}</Text>
          </View>
          {partnerMood.memo ? <Text style={styles.todayMemo}>"{partnerMood.memo}"</Text> : null}
        </View>
      )}

      {/* ── 입력 폼 ── */}
      {showForm && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>나의 컨디션</Text>

          <Text style={styles.fieldLabel}>에너지</Text>
          <View style={styles.energyRow}>
            {([1, 2, 3, 4, 5] as const).map(v => (
              <TouchableOpacity
                key={v}
                testID={`btn-energy-${v}`}
                style={[styles.energyBtn, energy === v && styles.energyBtnActive]}
                onPress={() => setEnergy(v)}
              >
                <Text style={styles.energyEmoji}>{ENERGY_EMOJIS[v]}</Text>
                <Text style={[styles.energyNum, energy === v && styles.energyNumActive]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>기분</Text>
          <View style={styles.moodRow}>
            {(['great', 'good', 'okay', 'bad'] as Mood[]).map(m => (
              <TouchableOpacity
                key={m}
                testID={`btn-mood-${m}`}
                style={[styles.moodChip, mood === m && { backgroundColor: MOOD_COLORS[m] }]}
                onPress={() => setMood(m)}
              >
                <Text style={[styles.moodChipText, mood === m && styles.moodChipTextActive]}>
                  {MOOD_LABELS[m]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.meetRow}>
            <Text style={styles.fieldLabel}>오늘 만남 가능</Text>
            <Switch
              value={canMeet}
              onValueChange={setCanMeet}
              trackColor={{ true: colors.accent.primary, false: colors.border.strong }}
              thumbColor={colors.text.inverse}
            />
          </View>

          <Text style={styles.fieldLabel}>
            메모 <Text style={styles.memoCount}>{memo.length}/200</Text>
          </Text>
          <TextInput
            style={styles.memoInput}
            value={memo}
            onChangeText={t => { if (t.length <= 200) setMemo(t); }}
            placeholder="오늘 어떤 하루였나요? (선택)"
            placeholderTextColor={colors.text.muted}
            multiline
            maxLength={200}
          />

          <View style={styles.saveBtn}>
            <Button testID="btn-mood-save" label={saving ? '저장 중...' : '저장'} onPress={handleSave} disabled={saving} />
          </View>
        </View>
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={() => setToast(t => ({ ...t, visible: false }))}
      />
    </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  safeArea:           { flex: 1, backgroundColor: colors.bg.base },
  container:          { flex: 1 },
  body:               { padding: space[5], gap: space[4], paddingBottom: space[12] },

  pageHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  screenTitle:        { ...typography.title2, color: colors.text.primary },
  editLink:           { ...typography.caption, color: colors.accent.primary },

  card:               { backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[5], gap: space[3], shadowColor: black, shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardLabel:          { ...typography.bodyBold, color: colors.text.primary },

  // 오늘 나란히 카드
  todayRow:           { flexDirection: 'row', gap: space[3] },
  todayCard:          { flex: 1, backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[4], gap: space[2], shadowColor: black, shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  todayCardLabel:     { ...typography.tiny, color: colors.text.muted, fontFamily: 'Pretendard-SemiBold' },
  todayCardEnergy:    { fontSize: 32 },
  todayMoodBadge:     { alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: space[2], borderRadius: radius.pill },
  todayMoodBadgeText: { fontSize: 11, lineHeight: 16, color: colors.text.inverse, fontFamily: 'Pretendard-SemiBold' },
  todayMeet:          { ...typography.tiny, color: colors.text.secondary },
  todayMemo:          { ...typography.tiny, color: colors.text.muted, fontStyle: 'italic' },
  todayEmpty:         { ...typography.caption, color: colors.text.muted, paddingVertical: space[3] },

  // 파트너 inline (폼 중 표시용)
  partnerInlineRow:   { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  partnerEnergy:      { fontSize: 28 },

  // 7일 차트
  chartRow:           { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol:             { flex: 1, alignItems: 'center', gap: 4, paddingVertical: space[2], paddingHorizontal: 2, borderRadius: radius.md },
  dayColToday:        { backgroundColor: colors.bg.subtle },
  bubble:             { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  bubbleEmpty:        { borderWidth: 1, borderColor: colors.border.subtle },
  bubbleEmoji:        { fontSize: 15 },
  dayLabel:           { ...typography.tiny, color: colors.text.muted, fontFamily: 'Pretendard-SemiBold' },
  dayLabelToday:      { color: colors.accent.primary },
  dayDateLabel:       { fontSize: 9, lineHeight: 12, color: colors.text.muted, fontFamily: 'Pretendard-Regular' },
  chartLegend:        { flexDirection: 'row', gap: space[4] },
  legendItem:         { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  legendDot:          { width: 8, height: 8, borderRadius: 4 },
  legendText:         { ...typography.tiny, color: colors.text.muted },

  // 입력 폼
  fieldLabel:         { ...typography.caption, color: colors.text.secondary },
  energyRow:          { flexDirection: 'row', gap: space[2] },
  energyBtn:          { flex: 1, alignItems: 'center', paddingVertical: space[2], borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.subtle },
  energyBtnActive:    { borderColor: colors.accent.primary, backgroundColor: colors.bg.subtle },
  energyEmoji:        { fontSize: 20 },
  energyNum:          { ...typography.tiny, color: colors.text.muted },
  energyNumActive:    { color: colors.accent.primary, fontFamily: 'Pretendard-SemiBold' },
  moodRow:            { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  moodChip:           { paddingVertical: space[2], paddingHorizontal: space[3], borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border.subtle },
  moodChipText:       { ...typography.caption, color: colors.text.secondary },
  moodChipTextActive: { color: colors.text.inverse, fontFamily: 'Pretendard-SemiBold' },
  meetRow:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memoInput:          { backgroundColor: colors.bg.subtle, borderRadius: radius.md, padding: space[3], ...typography.body, color: colors.text.primary, minHeight: 72 },
  memoCount:          { ...typography.tiny, color: colors.text.muted },
  saveBtn:            { marginTop: space[2] },
});
