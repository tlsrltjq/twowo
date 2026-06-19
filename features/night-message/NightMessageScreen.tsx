import { router } from 'expo-router';
import { ChevronLeft, Clock } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
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

import { usePartnerProfile } from '../../core/couple';
import { useAuthStore } from '../../core/stores/auth.store';
import { Skeleton } from '../../design-system/Skeleton';
import { Spinner } from '../../design-system/Spinner';
import { useColors } from '../../design-system/ThemeContext';
import { Colors } from '../../design-system/themes';
import { radius, space, typography } from '../../design-system/tokens';
import {
  getMessageHistory,
  MessageHistoryEntry,
  MessageType,
  NightMessage,
  sendNightMessage,
  subscribeTodayMessages,
} from './index';

const TABS: { key: MessageType; label: string; emoji: string }[] = [
  { key: 'night',   label: '잘자',      emoji: '🌙' },
  { key: 'morning', label: '좋은 아침', emoji: '☀️' },
];

const QUICK_PHRASES: Record<MessageType, string[]> = {
  night:   ['잘자 😴', '꿈에 나와줘 🌙', '오늘 고마워 💕', '좋은 꿈 꿔 🌟', '보고 싶어 😊', '내일 봐 👋', '사랑해 ❤️'],
  morning: ['좋은 아침 ☀️', '잘 잤어? 😊', '오늘도 화이팅 💪', '보고 싶다 💕', '밥 먹었어? 🍳', '오늘 뭐 해? 😄', '사랑해 ❤️'],
};

function formatTime(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

type ScreenMode = 'main' | 'history';

export default function NightMessageScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { user, coupleId } = useAuthStore();
  const { partnerUid, partnerName } = usePartnerProfile(coupleId, user?.uid ?? null);
  const [activeType, setActiveType] = useState<MessageType>('night');
  const [mine, setMine]       = useState<NightMessage | null | 'loading'>('loading');
  const [partner, setPartner] = useState<NightMessage | null | 'loading'>('loading');
  const [draft, setDraft]     = useState('');
  const [sending, setSending] = useState(false);
  const [mode, setMode]       = useState<ScreenMode>('main');

  const [history, setHistory]               = useState<MessageHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!coupleId || !user || !partnerUid) return;
    setMine('loading');
    setPartner('loading');
    return subscribeTodayMessages(coupleId, user.uid, partnerUid, activeType, (m, p) => {
      setMine(m);
      setPartner(p);
    });
  }, [coupleId, user?.uid, partnerUid, activeType]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadHistory = useCallback(async () => {
    if (!coupleId || !user || !partnerUid) return;
    setHistoryLoading(true);
    try {
      setHistory(await getMessageHistory(coupleId, user.uid, partnerUid));
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  }, [coupleId, user?.uid, partnerUid]);

  useEffect(() => {
    if (mode === 'history') loadHistory();
  }, [mode, loadHistory]);

  const handleSend = async () => {
    if (!coupleId || !user || sending) return;
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      await sendNightMessage(coupleId, user.uid, activeType, text);
      setDraft('');
    } catch (e: unknown) {
      Alert.alert('오류', e instanceof Error ? e.message : '다시 시도해주세요');
    } finally {
      setSending(false);
    }
  };

  const handleEdit = () => {
    if (mine && mine !== 'loading') {
      setDraft(mine.text);
      setMine(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // ── history mode ──────────────────────────────────────────────────────────────
  if (mode === 'history') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setMode('main')} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ChevronLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>지난 메시지</Text>
          <View style={{ width: 36 }} />
        </View>

        {historyLoading ? (
          <View style={styles.center}><Spinner /></View>
        ) : history.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>💌</Text>
            <Text style={styles.emptyText}>아직 지난 메시지가 없어요</Text>
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={e => `${e.date}_${e.type}`}
            contentContainerStyle={styles.historyList}
            renderItem={({ item: entry }) => (
              <HistoryCard
                entry={entry}
                partnerName={partnerName ?? '상대방'}
                styles={styles}
                colors={colors}
              />
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  // ── main mode ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView testID="screen-night-message" style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ChevronLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>자기 전 한 마디</Text>
        <TouchableOpacity onPress={() => setMode('history')} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="지난 메시지">
          <Clock size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            testID={`tab-${tab.key}`}
            style={[styles.tab, activeType === tab.key && styles.tabActive]}
            onPress={() => setActiveType(tab.key)}
          >
            <Text style={[styles.tabText, activeType === tab.key && styles.tabTextActive]}>
              {tab.emoji} {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* 상대방 메시지 */}
          <Text style={styles.sectionLabel}>💬 {partnerName}의 메시지</Text>
          {partner === 'loading' ? (
            <Skeleton style={styles.messageSkeleton} />
          ) : partner === null ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>아직 메시지가 없어요</Text>
              <Text style={styles.emptyHint}>상대방의 메시지를 기다리고 있어요</Text>
            </View>
          ) : (
            <View style={[styles.messageCard, styles.partnerCard]}>
              <Text style={styles.messageText}>{partner.text}</Text>
              <Text style={styles.messageMeta}>{formatTime(partner.sentAt)}</Text>
            </View>
          )}

          {/* 내 메시지 */}
          <Text style={[styles.sectionLabel, { marginTop: space[5] }]}>✏️ 내 메시지</Text>
          {mine === 'loading' ? (
            <Skeleton style={styles.messageSkeleton} />
          ) : mine !== null ? (
            <View style={[styles.messageCard, styles.myCard]}>
              <Text style={styles.messageText}>{mine.text}</Text>
              <View style={styles.myCardFooter}>
                <Text style={styles.messageMeta}>{formatTime(mine.sentAt)}</Text>
                <TouchableOpacity onPress={handleEdit} style={styles.editBtn}>
                  <Text style={styles.editBtnText}>수정</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.inputWrapper}>
              <TextInput
                ref={inputRef}
                testID="input-night-message"
                style={styles.textInput}
                placeholder="한 마디 남기기..."
                placeholderTextColor={colors.text.muted}
                value={draft}
                onChangeText={setDraft}
                maxLength={100}
                multiline
                returnKeyType="send"
                onSubmitEditing={handleSend}
              />
              {/* 빠른 문구 제안 */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.phrasesScroll} contentContainerStyle={styles.phrasesContent}>
                {QUICK_PHRASES[activeType].map(phrase => (
                  <TouchableOpacity key={phrase} style={styles.phraseChip} onPress={() => setDraft(phrase)}>
                    <Text style={styles.phraseChipText}>{phrase}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.inputFooter}>
                <Text style={styles.charCount}>{draft.trim().length}/100</Text>
                <TouchableOpacity
                  testID="btn-send-message"
                  style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
                  onPress={handleSend}
                  disabled={!draft.trim() || sending}
                >
                  <Text style={styles.sendBtnText}>{sending ? '전송 중...' : '보내기'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── history card ─────────────────────────────────────────────────────────────

type StylesType = ReturnType<typeof makeStyles>;

function HistoryCard({
  entry,
  partnerName,
  styles,
  colors,
}: {
  entry: MessageHistoryEntry;
  partnerName: string;
  styles: StylesType;
  colors: Colors;
}) {
  return (
    <View style={styles.historyCard}>
      <View style={styles.historyCardHeader}>
        <Text style={styles.historyCardDate}>{formatDate(entry.date)}</Text>
        <View style={styles.historyTypeBadge}>
          <Text style={styles.historyTypeBadgeText}>
            {entry.type === 'night' ? '🌙 잘자' : '☀️ 좋은 아침'}
          </Text>
        </View>
      </View>

      {entry.partner && (
        <View style={[styles.historyMsg, styles.historyMsgPartner]}>
          <Text style={styles.historyMsgLabel}>{partnerName}</Text>
          <Text style={styles.historyMsgText}>{entry.partner.text}</Text>
          <Text style={styles.historyMsgTime}>{formatTime(entry.partner.sentAt)}</Text>
        </View>
      )}
      {entry.mine && (
        <View style={[styles.historyMsg, styles.historyMsgMine]}>
          <Text style={styles.historyMsgLabel}>나</Text>
          <Text style={styles.historyMsgText}>{entry.mine.text}</Text>
          <Text style={styles.historyMsgTime}>{formatTime(entry.mine.sentAt)}</Text>
        </View>
      )}
      {!entry.mine && !entry.partner && (
        <Text style={styles.historyEmpty}>메시지 없음</Text>
      )}
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const makeStyles = (colors: Colors) => StyleSheet.create({
  safeArea:    { flex: 1, backgroundColor: colors.bg.base },
  flex:        { flex: 1 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3] },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], paddingVertical: space[4], borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  backBtn:     { padding: space[1], width: 36 },
  headerTitle: { ...typography.title2, color: colors.text.primary, flex: 1, textAlign: 'center' },
  iconBtn:     { padding: space[2], width: 36, alignItems: 'flex-end' },

  tabBar:      { flexDirection: 'row', backgroundColor: colors.bg.surface, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  tab:         { flex: 1, paddingVertical: space[3], alignItems: 'center' },
  tabActive:   { borderBottomWidth: 2, borderBottomColor: colors.accent.primary },
  tabText:     { ...typography.body, color: colors.text.secondary },
  tabTextActive: { ...typography.body, color: colors.accent.primary, fontFamily: 'Pretendard-SemiBold' },

  body:        { padding: space[5], gap: space[3], paddingBottom: space[10] },

  sectionLabel: { ...typography.caption, color: colors.text.muted, fontFamily: 'Pretendard-SemiBold', letterSpacing: 0.5 },

  messageSkeleton: { height: 80, borderRadius: radius.lg },

  emptyCard:   { backgroundColor: colors.bg.subtle, borderRadius: radius.lg, padding: space[5], alignItems: 'center', gap: space[2] },
  emptyText:   { ...typography.body, color: colors.text.secondary },
  emptyHint:   { ...typography.caption, color: colors.text.muted },
  emptyIcon:   { fontSize: 36 },

  messageCard:    { borderRadius: radius.lg, padding: space[4], gap: space[2] },
  partnerCard:    { backgroundColor: colors.bg.surface, borderWidth: 1, borderColor: colors.border.subtle },
  myCard:         { backgroundColor: colors.accent.primary + '18' },
  messageText:    { ...typography.body, color: colors.text.primary, lineHeight: 22 },
  messageMeta:    { ...typography.tiny, color: colors.text.muted },
  myCardFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editBtn:        { paddingHorizontal: space[3], paddingVertical: space[1], backgroundColor: colors.bg.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border.subtle },
  editBtnText:    { ...typography.tiny, color: colors.text.secondary },

  inputWrapper:   { backgroundColor: colors.bg.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.subtle, overflow: 'hidden' },
  textInput:      { ...typography.body, color: colors.text.primary, padding: space[4], minHeight: 80, textAlignVertical: 'top' },

  phrasesScroll:   { borderTopWidth: 1, borderTopColor: colors.border.subtle },
  phrasesContent:  { flexDirection: 'row', gap: space[2], paddingHorizontal: space[3], paddingVertical: space[2] },
  phraseChip:      { backgroundColor: colors.bg.subtle, borderRadius: radius.pill, paddingHorizontal: space[3], paddingVertical: space[2], borderWidth: 1, borderColor: colors.border.subtle },
  phraseChipText:  { ...typography.caption, color: colors.text.secondary },

  inputFooter:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space[4], paddingBottom: space[3] },
  charCount:      { ...typography.tiny, color: colors.text.muted },
  sendBtn:        { paddingHorizontal: space[4], paddingVertical: space[2], backgroundColor: colors.accent.primary, borderRadius: radius.pill },
  sendBtnDisabled: { backgroundColor: colors.border.subtle },
  sendBtnText:    { ...typography.caption, color: colors.text.inverse, fontFamily: 'Pretendard-SemiBold' },

  // history
  historyList:          { padding: space[4], gap: space[3], paddingBottom: space[8] },
  historyCard:          { backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[4], gap: space[3], borderWidth: 1, borderColor: colors.border.subtle },
  historyCardHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyCardDate:      { ...typography.bodyBold, color: colors.text.primary },
  historyTypeBadge:     { backgroundColor: colors.bg.subtle, borderRadius: radius.pill, paddingHorizontal: space[3], paddingVertical: space[1] },
  historyTypeBadgeText: { ...typography.tiny, color: colors.text.secondary },
  historyMsg:           { borderRadius: radius.md, padding: space[3], gap: 2 },
  historyMsgPartner:    { backgroundColor: colors.bg.subtle },
  historyMsgMine:       { backgroundColor: colors.accent.primary + '14' },
  historyMsgLabel:      { ...typography.tiny, color: colors.text.muted },
  historyMsgText:       { ...typography.body, color: colors.text.primary, lineHeight: 20 },
  historyMsgTime:       { ...typography.tiny, color: colors.text.muted, textAlign: 'right' },
  historyEmpty:         { ...typography.caption, color: colors.text.muted, textAlign: 'center' },
});
