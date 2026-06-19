import { useRouter } from 'expo-router';
import { ChevronLeft, Clock } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { subscribeCouple } from '../../core/couple';
import { useAuthStore } from '../../core/stores/auth.store';
import { getTodayKST } from '../../core/utils/date';
import { Button } from '../../design-system/Button';
import { Spinner } from '../../design-system/Spinner';
import { Toast } from '../../design-system/Toast';
import { useColors } from '../../design-system/ThemeContext';
import { Colors } from '../../design-system/themes';
import { black, radius, space, typography } from '../../design-system/tokens';
import {
  getPairedGratitudeHistory,
  getTodayGratitude,
  GratitudePair,
  setTodayGratitude,
  subscribePartnerGratitudeToday,
} from './index';
import { GratitudeEntry, GratitudeLockError } from './schema';

const MAX_LEN = 100;

type ToastState  = { message: string; type: 'success' | 'error' | 'info'; visible: boolean };
type ScreenMode  = 'main' | 'history';

function formatHistoryDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

// ─── screen ───────────────────────────────────────────────────────────────────

export default function GratitudeScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { user, coupleId } = useAuthStore();

  const [myEntry, setMyEntry]           = useState<GratitudeEntry | null>(null);
  const [partnerEntry, setPartnerEntry] = useState<GratitudeEntry | null>(null);
  const [partnerUid, setPartnerUid]     = useState<string | null>(null);
  const [partnerName, setPartnerName]   = useState<string>('상대방');
  const [loading, setLoading]           = useState(true);

  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);

  const [mode, setMode]               = useState<ScreenMode>('main');
  const [pairs, setPairs]             = useState<GratitudePair[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [limitDays, setLimitDays]     = useState(15);

  const [toast, setToast] = useState<ToastState>({ message: '', type: 'success', visible: false });
  const show = (msg: string, type: ToastState['type']) =>
    setToast({ message: msg, type, visible: true });

  const unsubPartnerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!user || !coupleId) return;

    (async () => {
      try {
        const todayMy = await getTodayGratitude(coupleId, user.uid);
        setMyEntry(todayMy);
        if (todayMy) setMessage(todayMy.message);
      } finally {
        setLoading(false);
      }
    })();

    const unsubCouple = subscribeCouple(coupleId, (couple) => {
      const pid = (couple.memberIds as string[]).find(id => id !== user.uid) ?? null;
      setPartnerUid(pid);
      // 닉네임이 있으면 couple 데이터에서 꺼냄
      const nicknames = (couple as unknown as Record<string, unknown>).nicknames as Record<string, string> | undefined;
      if (pid && nicknames?.[pid]) setPartnerName(nicknames[pid]!);

      unsubPartnerRef.current?.();
      if (pid) {
        unsubPartnerRef.current = subscribePartnerGratitudeToday(coupleId, pid, setPartnerEntry);
      }
    });

    return () => {
      unsubCouple();
      unsubPartnerRef.current?.();
    };
  }, [user, coupleId]);

  const loadHistory = useCallback(async (days: number) => {
    if (!coupleId || !user || !partnerUid) return;
    setHistoryLoading(true);
    try {
      setPairs(await getPairedGratitudeHistory(coupleId, user.uid, partnerUid, days));
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  }, [coupleId, user?.uid, partnerUid]);

  useEffect(() => {
    if (mode === 'history') loadHistory(limitDays);
  }, [mode, limitDays, loadHistory]);

  const handleSave = useCallback(async () => {
    if (!user || !coupleId || saving) return;
    if (!message.trim()) { show('내용을 입력해 주세요', 'error'); return; }
    setSaving(true);
    try {
      const result = await setTodayGratitude({ coupleId, userId: user.uid, message: message.trim() });
      setMyEntry(result);
      setEditing(false);
      show('고마움을 전달했어요 🙏', 'success');
    } catch (e) {
      if (e instanceof GratitudeLockError) {
        show('오늘만 수정할 수 있어요', 'error');
      } else {
        show('저장에 실패했어요', 'error');
      }
    } finally {
      setSaving(false);
    }
  }, [user, coupleId, message, saving]);

  const isToday = (entry: GratitudeEntry) => entry.date === getTodayKST();

  if (!coupleId) return <Spinner />;
  if (loading)   return <Spinner />;

  // ── history mode ────────────────────────────────────────────────────────────

  if (mode === 'history') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setMode('main')} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ChevronLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>지난 고마움</Text>
          <View style={{ width: 36 }} />
        </View>

        {historyLoading ? (
          <View style={styles.center}><Spinner /></View>
        ) : pairs.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>🙏</Text>
            <Text style={styles.emptyText}>아직 지난 기록이 없어요</Text>
          </View>
        ) : (
          <FlatList
            data={pairs}
            keyExtractor={p => p.date}
            contentContainerStyle={styles.historyList}
            renderItem={({ item: pair }) => (
              <HistoryPairCard
                pair={pair}
                partnerName={partnerName}
                styles={styles}
                colors={colors}
              />
            )}
            ListFooterComponent={
              pairs.length === limitDays ? (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={() => setLimitDays(prev => prev + 15)}
                  disabled={historyLoading}
                >
                  <Text style={styles.loadMoreText}>
                    {historyLoading ? '불러오는 중...' : '15일 더 보기'}
                  </Text>
                </TouchableOpacity>
              ) : null
            }
          />
        )}
      </SafeAreaView>
    );
  }

  // ── main mode ────────────────────────────────────────────────────────────────

  const showForm = !myEntry || editing;

  return (
    <SafeAreaView testID="screen-gratitude" style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ChevronLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>오늘의 고마움</Text>
        <TouchableOpacity onPress={() => { setLimitDays(15); setMode('history'); }} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="지난 고마움">
          <Clock size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.container} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

          {/* 내 고마움 카드 */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>나의 고마움</Text>
              {myEntry && !editing && isToday(myEntry) && (
                <TouchableOpacity onPress={() => setEditing(true)}>
                  <Text style={styles.editLink}>수정</Text>
                </TouchableOpacity>
              )}
            </View>

            {showForm ? (
              <>
                <Text style={styles.fieldLabel}>
                  오늘 상대방에게 고마운 점을 적어보세요{' '}
                  <Text style={styles.charCount}>{message.length}/{MAX_LEN}</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={message}
                  onChangeText={t => { if (t.length <= MAX_LEN) setMessage(t); }}
                  placeholder="오늘 뭔가 고마웠나요? (1~100자)"
                  placeholderTextColor={colors.text.muted}
                  multiline
                  maxLength={MAX_LEN}
                  testID="input-gratitude"
                />
                <View style={styles.saveBtn}>
                  <Button
                    testID="btn-gratitude-save"
                    label={saving ? '전달 중...' : '전달하기'}
                    onPress={handleSave}
                    disabled={saving}
                  />
                </View>
              </>
            ) : (
              <GratitudeDisplay entry={myEntry} styles={styles} />
            )}
          </View>

          {/* 상대방 고마움 카드 */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{partnerName}의 고마움</Text>
            {partnerEntry ? (
              <GratitudeDisplay entry={partnerEntry} testID="partner-gratitude" styles={styles} />
            ) : (
              <View style={styles.partnerEmpty}>
                <Text style={styles.partnerEmptyText}>아직 입력 전이에요 💭</Text>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

type StylesType = ReturnType<typeof makeStyles>;

function GratitudeDisplay({ entry, testID, styles }: { entry: GratitudeEntry; testID?: string; styles: StylesType }) {
  return (
    <View testID={testID} style={styles.displayBox}>
      <Text style={styles.displayMessage}>"{entry.message}"</Text>
    </View>
  );
}

function HistoryPairCard({
  pair, partnerName, styles, colors,
}: {
  pair: GratitudePair;
  partnerName: string;
  styles: StylesType;
  colors: Colors;
}) {
  return (
    <View style={styles.pairCard}>
      <Text style={styles.pairDate}>{formatHistoryDate(pair.date)}</Text>

      {pair.mine && (
        <View style={[styles.pairMsg, styles.pairMsgMine]}>
          <Text style={styles.pairMsgLabel}>나</Text>
          <Text style={styles.pairMsgText}>{pair.mine.message}</Text>
        </View>
      )}
      {pair.partner && (
        <View style={[styles.pairMsg, styles.pairMsgPartner]}>
          <Text style={styles.pairMsgLabel}>{partnerName}</Text>
          <Text style={styles.pairMsgText}>{pair.partner.message}</Text>
        </View>
      )}
      {!pair.mine && !pair.partner && (
        <Text style={styles.pairEmpty}>기록 없음</Text>
      )}
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const makeStyles = (colors: Colors) => StyleSheet.create({
  safeArea:        { flex: 1, backgroundColor: colors.bg.base },
  flex:            { flex: 1 },
  container:       { flex: 1 },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3] },

  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], paddingVertical: space[4], borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  backBtn:         { padding: space[1], width: 36 },
  headerTitle:     { ...typography.title2, color: colors.text.primary, flex: 1, textAlign: 'center' },
  iconBtn:         { padding: space[2], width: 36, alignItems: 'flex-end' },

  body:            { padding: space[5], gap: space[4], paddingBottom: space[12] },
  card:            { backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[5], gap: space[3], shadowColor: black, shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel:       { ...typography.bodyBold, color: colors.text.primary },
  editLink:        { ...typography.caption, color: colors.accent.primary },
  fieldLabel:      { ...typography.caption, color: colors.text.secondary },
  charCount:       { ...typography.tiny, color: colors.text.muted },
  textInput:       { backgroundColor: colors.bg.subtle, borderRadius: radius.md, padding: space[3], ...typography.body, color: colors.text.primary, minHeight: 88 },
  saveBtn:         { marginTop: space[2] },
  displayBox:      { paddingVertical: space[2] },
  displayMessage:  { ...typography.body, color: colors.text.primary, lineHeight: 24, fontStyle: 'italic' },
  partnerEmpty:    { paddingVertical: space[5], alignItems: 'center' },
  partnerEmptyText:{ ...typography.body, color: colors.text.muted },

  emptyIcon:       { fontSize: 36 },
  emptyText:       { ...typography.bodyBold, color: colors.text.muted },

  // history
  historyList:     { padding: space[4], gap: space[3], paddingBottom: space[8] },
  pairCard:        { backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[4], gap: space[3], borderWidth: 1, borderColor: colors.border.subtle },
  pairDate:        { ...typography.bodyBold, color: colors.text.primary },
  pairMsg:         { borderRadius: radius.md, padding: space[3], gap: space[1] },
  pairMsgMine:     { backgroundColor: colors.accent.primary + '14' },
  pairMsgPartner:  { backgroundColor: colors.bg.subtle },
  pairMsgLabel:    { ...typography.tiny, color: colors.text.muted },
  pairMsgText:     { ...typography.body, color: colors.text.primary, lineHeight: 22 },
  pairEmpty:       { ...typography.caption, color: colors.text.muted, textAlign: 'center' },

  loadMoreBtn:     { marginTop: space[2], paddingVertical: space[4], alignItems: 'center', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.subtle },
  loadMoreText:    { ...typography.body, color: colors.accent.primary },
});
