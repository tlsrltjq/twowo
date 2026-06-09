import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Button } from '../../design-system/Button';
import { EmptyState } from '../../design-system/EmptyState';
import { Spinner } from '../../design-system/Spinner';
import { Toast } from '../../design-system/Toast';
import { colors, radius, space, typography } from '../../design-system/tokens';
import { subscribeCouple } from '../../core/couple';
import { getTodayKST } from '../../core/utils/date';
import { useAuthStore } from '../../core/stores/auth.store';
import {
  getTodayMood,
  setTodayMood,
  subscribePartnerMoodToday,
  getRecent7Days,
} from './index';
import { Mood, MoodCheck, MoodLockedError } from './schema';

const ENERGY_EMOJIS = ['', '😴', '😑', '🙂', '😊', '🔥'] as const;
const MOOD_LABELS: Record<Mood, string> = {
  great: '최고 🌟',
  good:  '좋아 😊',
  okay:  '보통 😐',
  bad:   '별로 😔',
};
const MOOD_COLORS: Record<Mood, string> = {
  great: colors.status.success,
  good:  colors.accent.primary,
  okay:  colors.accent.warm,
  bad:   colors.status.danger,
};

type ToastState = { message: string; type: 'success' | 'error' | 'info'; visible: boolean };

export default function MoodScreen() {
  const { user, coupleId } = useAuthStore();
  const [myMood, setMyMood]         = useState<MoodCheck | null>(null);
  const [partnerMood, setPartnerMood] = useState<MoodCheck | null>(null);
  const [history, setHistory]       = useState<MoodCheck[]>([]);
  const [loading, setLoading]       = useState(true);

  // 폼 상태
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

    // couples.memberIds → partnerUid 추출 → 상대 컨디션 실시간 구독 (BR-6)
    const unsubCouple = subscribeCouple(coupleId, (couple) => {
      const partnerUid = (couple.memberIds as string[]).find(id => id !== user.uid) ?? null;
      unsubPartnerRef.current?.();
      if (partnerUid) {
        unsubPartnerRef.current = subscribePartnerMoodToday(coupleId, partnerUid, setPartnerMood);
      }
    });

    return () => {
      unsubCouple();
      unsubPartnerRef.current?.();
    };
  }, [user, coupleId]);

  const handleSave = useCallback(async () => {
    if (!user || !coupleId || saving) return;
    setSaving(true);
    try {
      const result = await setTodayMood({ coupleId, userId: user.uid, energy, mood, canMeet, memo: memo || undefined });
      setMyMood(result);
      setEditing(false);
      show('컨디션이 저장됐어요 ✅', 'success');
      // 히스토리 갱신
      const hist = await getRecent7Days(coupleId, user.uid);
      setHistory(hist);
    } catch (e) {
      if (e instanceof MoodLockedError) {
        show('오늘 컨디션은 이미 잠겼습니다', 'error');
      } else {
        show('저장에 실패했어요', 'error');
      }
    } finally {
      setSaving(false);
    }
  }, [user, coupleId, energy, mood, canMeet, memo, saving]);

  const isToday = (check: MoodCheck) => check.date === getTodayKST();

  if (!coupleId) return <Spinner />;
  if (loading)   return <Spinner />;

  const showForm = !myMood || editing;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <Text style={styles.screenTitle}>오늘의 컨디션</Text>

      {/* 내 컨디션 카드 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardLabel}>나의 컨디션</Text>
          {myMood && !editing && isToday(myMood) && (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={styles.editLink}>수정</Text>
            </TouchableOpacity>
          )}
        </View>

        {showForm ? (
          <>
            {/* 에너지 선택 */}
            <Text style={styles.fieldLabel}>에너지</Text>
            <View style={styles.energyRow}>
              {([1, 2, 3, 4, 5] as const).map(v => (
                <TouchableOpacity
                  key={v}
                  style={[styles.energyBtn, energy === v && styles.energyBtnActive]}
                  onPress={() => setEnergy(v)}
                >
                  <Text style={styles.energyEmoji}>{ENERGY_EMOJIS[v]}</Text>
                  <Text style={[styles.energyNum, energy === v && styles.energyNumActive]}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 기분 선택 */}
            <Text style={styles.fieldLabel}>기분</Text>
            <View style={styles.moodRow}>
              {(['great', 'good', 'okay', 'bad'] as Mood[]).map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.moodChip, mood === m && { backgroundColor: MOOD_COLORS[m] }]}
                  onPress={() => setMood(m)}
                >
                  <Text style={[styles.moodChipText, mood === m && styles.moodChipTextActive]}>
                    {MOOD_LABELS[m]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 만남 가능 */}
            <View style={styles.meetRow}>
              <Text style={styles.fieldLabel}>오늘 만남 가능</Text>
              <Switch
                value={canMeet}
                onValueChange={setCanMeet}
                trackColor={{ true: colors.accent.primary, false: colors.border.strong }}
                thumbColor={colors.text.inverse}
              />
            </View>

            {/* 메모 — BR-5: 200자 제한 */}
            <Text style={styles.fieldLabel}>메모 <Text style={styles.memoCount}>{memo.length}/200</Text></Text>
            <TextInput
              style={styles.memoInput}
              value={memo}
              onChangeText={t => { if (t.length <= 200) setMemo(t); }} // BR-5: 200자 초과 입력 차단
              placeholder="오늘 어떤 하루였나요? (선택)"
              placeholderTextColor={colors.text.muted}
              multiline
              maxLength={200}
            />

            <View style={styles.saveBtn}>
              <Button label={saving ? '저장 중...' : '저장'} onPress={handleSave} disabled={saving} />
            </View>
          </>
        ) : (
          <MoodDisplay check={myMood} />
        )}
      </View>

      {/* 상대방 컨디션 카드 */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>상대방 컨디션</Text>
        {partnerMood ? (
          <MoodDisplay check={partnerMood} readonly />
        ) : (
          <View style={styles.partnerEmpty}>
            <Text style={styles.partnerEmptyText}>아직 입력 전이에요 💭</Text>
          </View>
        )}
      </View>

      {/* 히스토리 */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>최근 7일</Text>
        {history.length === 0 ? (
          <EmptyState title="기록이 없어요" description="오늘 컨디션을 입력해보세요" />
        ) : (
          <View style={styles.historyGrid}>
            {history.map(h => (
              <HistoryRow key={h.id} check={h} isToday={isToday(h)} />
            ))}
          </View>
        )}
      </View>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={() => setToast(t => ({ ...t, visible: false }))}
      />
    </ScrollView>
  );
}

function MoodDisplay({ check, readonly = false }: { check: MoodCheck; readonly?: boolean }) {
  return (
    <View style={styles.displayRow}>
      <Text style={styles.displayEnergy}>{ENERGY_EMOJIS[check.energy]} {check.energy}</Text>
      <View style={[styles.moodBadge, { backgroundColor: MOOD_COLORS[check.mood] }]}>
        <Text style={styles.moodBadgeText}>{MOOD_LABELS[check.mood]}</Text>
      </View>
      <Text style={styles.displayMeet}>{check.canMeet ? '✅ 만남 가능' : '❌ 오늘은 어렵대요'}</Text>
      {check.memo ? <Text style={styles.displayMemo}>"{check.memo}"</Text> : null}
    </View>
  );
}

function HistoryRow({ check, isToday }: { check: MoodCheck; isToday: boolean }) {
  return (
    <View style={styles.historyRow}>
      <Text style={[styles.historyDate, isToday && styles.historyDateToday]}>
        {isToday ? '오늘' : check.date.slice(5)}
      </Text>
      <Text style={styles.historyEnergy}>{ENERGY_EMOJIS[check.energy]}</Text>
      <View style={[styles.historyMoodDot, { backgroundColor: MOOD_COLORS[check.mood] }]} />
      <Text style={styles.historyMeet}>{check.canMeet ? '✅' : '❌'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: colors.bg.base },
  body:               { padding: space[5], gap: space[4], paddingBottom: space[12] },
  screenTitle:        { ...typography.title2, color: colors.text.primary },
  card:               { backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[5], gap: space[3], shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel:          { ...typography.bodyBold, color: colors.text.primary },
  editLink:           { ...typography.caption, color: colors.accent.primary },
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
  displayRow:         { gap: space[2] },
  displayEnergy:      { ...typography.title2, color: colors.text.primary },
  moodBadge:          { alignSelf: 'flex-start', paddingVertical: space[1], paddingHorizontal: space[3], borderRadius: radius.pill },
  moodBadgeText:      { ...typography.caption, color: colors.text.inverse, fontFamily: 'Pretendard-SemiBold' },
  displayMeet:        { ...typography.body, color: colors.text.secondary },
  displayMemo:        { ...typography.caption, color: colors.text.muted, fontStyle: 'italic' },
  partnerEmpty:       { paddingVertical: space[5], alignItems: 'center' },
  partnerEmptyText:   { ...typography.body, color: colors.text.muted },
  historyGrid:        { gap: space[2] },
  historyRow:         { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[1] },
  historyDate:        { ...typography.caption, color: colors.text.muted, width: 48 },
  historyDateToday:   { color: colors.accent.primary, fontFamily: 'Pretendard-SemiBold' },
  historyEnergy:      { fontSize: 20, width: 28 },
  historyMoodDot:     { width: 10, height: 10, borderRadius: 5 },
  historyMeet:        { ...typography.caption },
});
