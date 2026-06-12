import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
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
import { EmptyState } from '../../design-system/EmptyState';
import { Spinner } from '../../design-system/Spinner';
import { Toast } from '../../design-system/Toast';
import { black, colors, radius, space, typography } from '../../design-system/tokens';
import {
  getRecent7DaysGratitude,
  getTodayGratitude,
  setTodayGratitude,
  subscribePartnerGratitudeToday,
} from './index';
import { GratitudeEntry, GratitudeLockError } from './schema';

const MAX_LEN = 100;

type ToastState = { message: string; type: 'success' | 'error' | 'info'; visible: boolean };

export default function GratitudeScreen() {
  const router = useRouter();
  const { user, coupleId } = useAuthStore();
  const [myEntry, setMyEntry]         = useState<GratitudeEntry | null>(null);
  const [partnerEntry, setPartnerEntry] = useState<GratitudeEntry | null>(null);
  const [history, setHistory]         = useState<GratitudeEntry[]>([]);
  const [loading, setLoading]         = useState(true);

  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);

  const [toast, setToast] = useState<ToastState>({ message: '', type: 'success', visible: false });
  const show = (msg: string, type: ToastState['type']) =>
    setToast({ message: msg, type, visible: true });

  const unsubPartnerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!user || !coupleId) return;

    (async () => {
      try {
        const [todayMy, hist] = await Promise.all([
          getTodayGratitude(coupleId, user.uid),
          getRecent7DaysGratitude(coupleId, user.uid),
        ]);
        setMyEntry(todayMy);
        setHistory(hist);
        if (todayMy) setMessage(todayMy.message);
      } finally {
        setLoading(false);
      }
    })();

    const unsubCouple = subscribeCouple(coupleId, (couple) => {
      const partnerUid = (couple.memberIds as string[]).find(id => id !== user.uid) ?? null;
      unsubPartnerRef.current?.();
      if (partnerUid) {
        unsubPartnerRef.current = subscribePartnerGratitudeToday(coupleId, partnerUid, setPartnerEntry);
      }
    });

    return () => {
      unsubCouple();
      unsubPartnerRef.current?.();
    };
  }, [user, coupleId]);

  const handleSave = useCallback(async () => {
    if (!user || !coupleId || saving) return;
    if (!message.trim()) { show('내용을 입력해 주세요', 'error'); return; }
    setSaving(true);
    try {
      const result = await setTodayGratitude({ coupleId, userId: user.uid, message: message.trim() });
      setMyEntry(result);
      setEditing(false);
      show('고마움을 전달했어요 🙏', 'success');
      const hist = await getRecent7DaysGratitude(coupleId, user.uid);
      setHistory(hist);
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

  const showForm = !myEntry || editing;

  return (
    <SafeAreaView testID="screen-gratitude" style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ChevronLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>오늘의 고마움</Text>
        <View style={{ width: 36 }} />
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
          <GratitudeDisplay entry={myEntry} />
        )}
      </View>

      {/* 상대방 고마움 카드 */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>상대방의 고마움</Text>
        {partnerEntry ? (
          <GratitudeDisplay entry={partnerEntry} readonly testID="partner-gratitude" />
        ) : (
          <View style={styles.partnerEmpty}>
            <Text style={styles.partnerEmptyText}>아직 입력 전이에요 💭</Text>
          </View>
        )}
      </View>

      {/* 히스토리 — BR-5 */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>최근 7일</Text>
        {history.length === 0 ? (
          <EmptyState title="기록이 없어요" description="오늘 고마움을 전해보세요" />
        ) : (
          <View style={styles.historyList}>
            {history.map(h => (
              <HistoryRow key={h.id} entry={h} isToday={isToday(h)} />
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
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function GratitudeDisplay({ entry, readonly: _readonly = false, testID }: { entry: GratitudeEntry; readonly?: boolean; testID?: string }) {
  return (
    <View testID={testID} style={styles.displayBox}>
      <Text style={styles.displayMessage}>"{entry.message}"</Text>
    </View>
  );
}

function HistoryRow({ entry, isToday }: { entry: GratitudeEntry; isToday: boolean }) {
  return (
    <View style={styles.historyRow}>
      <Text style={[styles.historyDate, isToday && styles.historyDateToday]}>
        {isToday ? '오늘' : entry.date.slice(5)}
      </Text>
      <Text style={styles.historyMessage} numberOfLines={1}>{entry.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea:           { flex: 1, backgroundColor: colors.bg.base },
  flex:               { flex: 1 },
  container:          { flex: 1 },
  body:               { padding: space[5], gap: space[4], paddingBottom: space[12] },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], paddingVertical: space[4], borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  backBtn:            { padding: space[1] },
  headerTitle:        { ...typography.title2, color: colors.text.primary },
  card:               { backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[5], gap: space[3], shadowColor: black, shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel:          { ...typography.bodyBold, color: colors.text.primary },
  editLink:           { ...typography.caption, color: colors.accent.primary },
  fieldLabel:         { ...typography.caption, color: colors.text.secondary },
  charCount:          { ...typography.tiny, color: colors.text.muted },
  textInput:          { backgroundColor: colors.bg.subtle, borderRadius: radius.md, padding: space[3], ...typography.body, color: colors.text.primary, minHeight: 88 },
  saveBtn:            { marginTop: space[2] },
  displayBox:         { paddingVertical: space[2] },
  displayMessage:     { ...typography.body, color: colors.text.primary, lineHeight: 24, fontStyle: 'italic' },
  partnerEmpty:       { paddingVertical: space[5], alignItems: 'center' },
  partnerEmptyText:   { ...typography.body, color: colors.text.muted },
  historyList:        { gap: space[2] },
  historyRow:         { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[1] },
  historyDate:        { ...typography.caption, color: colors.text.muted, width: 48 },
  historyDateToday:   { color: colors.accent.primary, fontFamily: 'Pretendard-SemiBold' },
  historyMessage:     { ...typography.caption, color: colors.text.secondary, flex: 1 },
});
