import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
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
import { ChevronLeft } from 'lucide-react-native';
import { doc, getDoc } from 'firebase/firestore';

import { subscribeCouple, Couple } from '../../core/couple';
import { db } from '../../core/config/firebase';
import { useAuthStore } from '../../core/stores/auth.store';
import { Skeleton } from '../../design-system/Skeleton';
import { colors, radius, space, typography } from '../../design-system/tokens';
import { MessageType, NightMessage, sendNightMessage, subscribeTodayMessages } from './index';

const TABS: { key: MessageType; label: string; emoji: string }[] = [
  { key: 'night',   label: '잘자',      emoji: '🌙' },
  { key: 'morning', label: '좋은 아침', emoji: '☀️' },
];

function formatTime(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export default function NightMessageScreen() {
  const { user, coupleId } = useAuthStore();
  const [couple, setCouple] = useState<Couple | null>(null);
  const [activeType, setActiveType] = useState<MessageType>('night');
  const [mine, setMine]       = useState<NightMessage | null | 'loading'>('loading');
  const [partner, setPartner] = useState<NightMessage | null | 'loading'>('loading');
  const [draft, setDraft]     = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const [partnerName, setPartnerName] = useState('상대방');

  const partnerUid = couple?.memberIds.find((id: string) => id !== user?.uid) ?? null;

  useEffect(() => {
    if (!coupleId) return;
    return subscribeCouple(coupleId, setCouple);
  }, [coupleId]);

  useEffect(() => {
    if (!partnerUid) return;
    getDoc(doc(db, 'users', partnerUid)).then(snap => {
      const displayName = snap.data()?.displayName as string | undefined;
      if (displayName) setPartnerName(displayName);
    });
  }, [partnerUid]);

  useEffect(() => {
    if (!coupleId || !user || !partnerUid) return;
    setMine('loading');
    setPartner('loading');
    return subscribeTodayMessages(coupleId, user.uid, partnerUid, activeType, (m, p) => {
      setMine(m);
      setPartner(p);
    });
  }, [coupleId, user?.uid, partnerUid, activeType]);

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ChevronLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>자기 전 한 마디</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* 탭바 */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
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
              <View style={styles.inputFooter}>
                <Text style={styles.charCount}>{draft.trim().length}/100</Text>
                <TouchableOpacity
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

const styles = StyleSheet.create({
  safeArea:    { flex: 1, backgroundColor: colors.bg.base },
  flex:        { flex: 1 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], paddingVertical: space[4], borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  backBtn:     { padding: space[1] },
  headerTitle: { ...typography.title2, color: colors.text.primary },

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
  inputFooter:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space[4], paddingBottom: space[3] },
  charCount:      { ...typography.tiny, color: colors.text.muted },
  sendBtn:        { paddingHorizontal: space[4], paddingVertical: space[2], backgroundColor: colors.accent.primary, borderRadius: radius.pill },
  sendBtnDisabled: { backgroundColor: colors.border.subtle },
  sendBtnText:    { ...typography.caption, color: colors.text.inverse, fontFamily: 'Pretendard-SemiBold' },
});
