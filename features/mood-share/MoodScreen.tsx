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
import { SectionHeader } from '../../design-system/SectionHeader';
import { Spinner } from '../../design-system/Spinner';
import { useColors } from '../../design-system/ThemeContext';
import { Colors } from '../../design-system/themes';
import { Toast } from '../../design-system/Toast';
import { hairline, radius, space, typography } from '../../design-system/tokens';
import {
  getRecent7Days,
  getTodayMood,
  setTodayMood,
  subscribePartnerMoodToday,
} from './index';
import { Mood, MoodCheck, MoodLockedError } from './schema';

const MOOD_LABELS: Record<Mood, string> = {
  great: '최고',
  good:  '좋음',
  okay:  '보통',
  bad:   '별로',
};
const MOODS: Mood[] = ['great', 'good', 'okay', 'bad'];
const ENERGIES = [1, 2, 3, 4, 5] as const;
const DOW_SHORT = ['일', '월', '화', '수', '목', '금', '토'];

type ToastState = { message: string; type: 'success' | 'error' | 'info'; visible: boolean };

function describe(check: MoodCheck): string {
  return [
    MOOD_LABELS[check.mood],
    `에너지 ${check.energy}/5`,
    check.canMeet ? '만날 수 있음' : '만나기 어려움',
  ].join(' · ');
}

// ── 오늘 한 줄 ────────────────────────────────────────────────
function TodayRow({
  label, check, styles,
}: {
  label: string;
  check: MoodCheck | null;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowBody}>
        {check ? (
          <>
            <Text style={styles.rowValue}>{describe(check)}</Text>
            {check.memo ? <Text style={styles.rowMemo}>{check.memo}</Text> : null}
          </>
        ) : (
          <Text style={styles.rowMuted}>아직 안 적었어요</Text>
        )}
      </View>
    </View>
  );
}

// ── 하루 컬럼 (7일 에너지 막대) ──────────────────────────────
function DayColumn({
  date, myCheck, partnerCheck, isToday, styles,
}: {
  date: string;
  myCheck?: MoodCheck;
  partnerCheck?: MoodCheck;
  isToday: boolean;
  styles: ReturnType<typeof makeStyles>;
}) {
  const d = new Date(date + 'T12:00:00');
  const barHeight = (check?: MoodCheck) => (check ? (check.energy / 5) * BAR_MAX : BAR_EMPTY);
  return (
    <View style={styles.dayCol}>
      <View style={styles.barPair}>
        <View style={[styles.bar, styles.barMine, { height: barHeight(myCheck) }, !myCheck && styles.barEmpty]} />
        <View style={[styles.bar, styles.barPartner, { height: barHeight(partnerCheck) }, !partnerCheck && styles.barEmpty]} />
      </View>
      <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
        {isToday ? '오늘' : DOW_SHORT[d.getDay()]}
      </Text>
      <Text style={styles.dayDateLabel}>{d.getMonth() + 1}/{d.getDate()}</Text>
    </View>
  );
}

function Segmented<T extends string | number>({
  options, value, onChange, label, testIDPrefix, styles,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label: (v: T) => string;
  testIDPrefix: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((v, i) => {
        const active = v === value;
        return (
          <TouchableOpacity
            key={String(v)}
            testID={`${testIDPrefix}-${v}`}
            style={[styles.segment, i > 0 && styles.segmentDivider, active && styles.segmentActive]}
            onPress={() => onChange(v)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label(v)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── 메인 ──────────────────────────────────────────────────────
export default function MoodScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

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
      show('저장했어요', 'success');
      const hist = await getRecent7Days(coupleId, user.uid);
      setHistory(hist);
    } catch (e) {
      if (e instanceof MoodLockedError) show('오늘 컨디션은 이제 바꿀 수 없어요', 'error');
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

      {/* ── 오늘 나 / 상대방 (저장 후) ── */}
      {!showForm && (
        <View>
          <SectionHeader title="오늘" />
          <TodayRow label="나" check={myMood} styles={styles} />
          <TodayRow label="상대방" check={partnerMood} styles={styles} />
        </View>
      )}

      {/* ── 폼 중일 때 상대방 오늘 컨디션 ── */}
      {showForm && partnerMood && (
        <View>
          <SectionHeader title="상대방 오늘" />
          <TodayRow label="상대방" check={partnerMood} styles={styles} />
        </View>
      )}

      {/* ── 입력 폼 ── */}
      {showForm && (
        <View style={styles.form}>
          <SectionHeader title="나의 오늘" />

          <View style={styles.field}>
            <View style={styles.fieldHead}>
              <Text style={styles.fieldLabel}>에너지</Text>
              <Text style={styles.fieldHint}>1 지침 · 5 쌩쌩</Text>
            </View>
            <Segmented
              options={ENERGIES}
              value={energy}
              onChange={setEnergy}
              label={v => String(v)}
              testIDPrefix="btn-energy"
              styles={styles}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>기분</Text>
            <Segmented
              options={MOODS}
              value={mood}
              onChange={setMood}
              label={m => MOOD_LABELS[m]}
              testIDPrefix="btn-mood"
              styles={styles}
            />
          </View>

          <View style={styles.meetRow}>
            <Text style={styles.fieldLabel}>오늘 만날 수 있어요</Text>
            <Switch
              value={canMeet}
              onValueChange={setCanMeet}
              trackColor={{ true: colors.accent.primary, false: colors.border.strong }}
              thumbColor={colors.text.inverse}
            />
          </View>

          <View style={styles.field}>
            <View style={styles.fieldHead}>
              <Text style={styles.fieldLabel}>메모</Text>
              <Text style={styles.fieldHint}>{memo.length}/200</Text>
            </View>
            <TextInput
              style={styles.memoInput}
              value={memo}
              onChangeText={t => { if (t.length <= 200) setMemo(t); }}
              placeholder="한 줄 남기기 (선택)"
              placeholderTextColor={colors.text.muted}
              multiline
              maxLength={200}
            />
          </View>

          <Button testID="btn-mood-save" label={saving ? '저장 중' : '저장'} onPress={handleSave} disabled={saving} />
        </View>
      )}

      {/* ── 7일 비교 ── */}
      {(history.length > 0 || partnerHistory.length > 0) && (
        <View>
          <SectionHeader
            title="최근 7일 에너지"
            right={(
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.barMine]} />
                  <Text style={styles.legendText}>나</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.barPartner]} />
                  <Text style={styles.legendText}>상대방</Text>
                </View>
              </View>
            )}
          />
          <View style={styles.chartRow}>
            {last7Days.map(date => (
              <DayColumn
                key={date}
                date={date}
                {...(myHistMap[date] !== undefined ? { myCheck: myHistMap[date] } : {})}
                {...(partnerHistMap[date] !== undefined ? { partnerCheck: partnerHistMap[date] } : {})}
                isToday={date === todayKST}
                styles={styles}
              />
            ))}
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

const BAR_MAX = space[12] + space[4];
const BAR_EMPTY = space[1];

const makeStyles = (colors: Colors) => StyleSheet.create({
  safeArea:           { flex: 1, backgroundColor: colors.bg.base },
  container:          { flex: 1 },
  body:               { paddingHorizontal: space[5], paddingTop: space[4], gap: space[8], paddingBottom: space[12] },

  pageHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  screenTitle:        { ...typography.title1, color: colors.text.primary },
  editLink:           { ...typography.caption, color: colors.accent.primary },

  // 오늘 행
  row:                { flexDirection: 'row', gap: space[4], paddingVertical: space[3], borderBottomWidth: hairline, borderBottomColor: colors.border.subtle },
  rowLabel:           { ...typography.caption, color: colors.text.secondary, width: space[12] + space[2] },
  rowBody:            { flex: 1, gap: space[1] },
  rowValue:           { ...typography.caption, color: colors.text.primary },
  rowMemo:            { ...typography.caption, color: colors.text.secondary },
  rowMuted:           { ...typography.caption, color: colors.text.muted },

  // 입력 폼
  form:               { gap: space[5] },
  field:              { gap: space[2] },
  fieldHead:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  fieldLabel:         { ...typography.caption, color: colors.text.primary },
  fieldHint:          { ...typography.tiny, color: colors.text.muted },
  segmented:          { flexDirection: 'row', borderWidth: hairline * 2, borderColor: colors.border.strong, borderRadius: radius.md, overflow: 'hidden' },
  segment:            { flex: 1, alignItems: 'center', paddingVertical: space[3], backgroundColor: colors.bg.surface },
  segmentDivider:     { borderLeftWidth: hairline * 2, borderLeftColor: colors.border.strong },
  segmentActive:      { backgroundColor: colors.text.primary },
  segmentText:        { ...typography.caption, color: colors.text.secondary },
  segmentTextActive:  { color: colors.text.inverse, fontFamily: typography.bodyBold.fontFamily },
  meetRow:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memoInput:          { backgroundColor: colors.bg.surface, borderWidth: hairline * 2, borderColor: colors.border.strong, borderRadius: radius.md, padding: space[3], ...typography.body, color: colors.text.primary, minHeight: space[12] + space[6] },

  // 7일 막대
  chartRow:           { flexDirection: 'row', justifyContent: 'space-between', paddingTop: space[4] },
  dayCol:             { flex: 1, alignItems: 'center', gap: space[1] },
  barPair:            { flexDirection: 'row', alignItems: 'flex-end', gap: space[1] - 1, height: BAR_MAX },
  bar:                { width: space[2], borderRadius: radius.sm - 2 },
  barMine:            { backgroundColor: colors.text.primary },
  barPartner:         { backgroundColor: colors.accent.primary },
  barEmpty:           { backgroundColor: colors.border.subtle },
  dayLabel:           { ...typography.tiny, color: colors.text.muted },
  dayLabelToday:      { color: colors.accent.primary },
  dayDateLabel:       { ...typography.tiny, color: colors.text.muted, opacity: 0.7 },
  chartLegend:        { flexDirection: 'row', gap: space[3] },
  legendItem:         { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  legendDot:          { width: space[2], height: space[2], borderRadius: radius.sm - 2 },
  legendText:         { ...typography.tiny, color: colors.text.muted },
});
