import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
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
import { EmptyState } from '../../design-system/EmptyState';
import { Skeleton } from '../../design-system/Skeleton';
import { black, colors, radius, space, typography } from '../../design-system/tokens';
import { Compliment, addCompliment, subscribeCompliments } from './index';

type ViewTab = 'received' | 'sent';

function formatDate(d: Date): string {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function ComplimentJarScreen() {
  const { user, coupleId } = useAuthStore();
  const [couple, setCouple]         = useState<Couple | null>(null);
  const [all, setAll]               = useState<Compliment[] | null>(null);
  const [activeTab, setActiveTab]   = useState<ViewTab>('received');
  const [modalVisible, setModal]    = useState(false);
  const [draft, setDraft]           = useState('');
  const [sending, setSending]       = useState(false);
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
    if (!coupleId) return;
    return subscribeCompliments(coupleId, setAll);
  }, [coupleId]);

  const received = all?.filter(c => c.toUid === user?.uid)   ?? [];
  const sent     = all?.filter(c => c.fromUid === user?.uid) ?? [];
  const displayed = activeTab === 'received' ? received : sent;
  const total     = all?.length ?? 0;

  const handleSend = async () => {
    if (!coupleId || !user || !partnerUid || sending) return;
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      await addCompliment(coupleId, user.uid, partnerUid, text);
      setDraft('');
      setModal(false);
    } catch (e: unknown) {
      Alert.alert('오류', e instanceof Error ? e.message : '다시 시도해주세요');
    } finally {
      setSending(false);
    }
  };

  const openModal = () => {
    setModal(true);
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ChevronLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>칭찬 저금통</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* 저금통 요약 */}
      <View style={styles.jarBanner}>
        <Text style={styles.jarEmoji}>🫙</Text>
        <Text style={styles.jarCount}>
          {all === null ? '...' : `우리가 쌓은 칭찬 ${total}개`}
        </Text>
      </View>

      {/* 탭 */}
      <View style={styles.tabBar}>
        {([
          { key: 'received' as ViewTab, label: `💝 ${partnerName}에게 받은` },
          { key: 'sent'     as ViewTab, label: '✏️ 내가 쓴 칭찬' },
        ]).map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 목록 */}
      {all === null ? (
        <View style={styles.skeletonContainer}>
          {[0, 1, 2].map(i => <Skeleton key={i} style={styles.skeletonRow} />)}
        </View>
      ) : displayed.length === 0 ? (
        <EmptyState
          title={activeTab === 'received' ? '아직 받은 칭찬이 없어요' : '아직 쓴 칭찬이 없어요'}
          description={activeTab === 'received' ? `${partnerName}이(가) 칭찬을 보내면 여기 나타나요` : '+ 버튼을 눌러 칭찬을 써보세요'}
        />
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <ComplimentCard compliment={item} />}
        />
      )}

      {/* FAB */}
      <Pressable style={styles.fab} onPress={openModal} accessibilityLabel="칭찬 쓰기">
        <Text style={styles.fabText}>＋</Text>
      </Pressable>

      {/* 작성 모달 */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>칭찬 저금하기 🫙</Text>
            <TextInput
              ref={inputRef}
              style={styles.modalInput}
              placeholder="상대에게 전하고 싶은 칭찬을 써보세요"
              placeholderTextColor={colors.text.muted}
              value={draft}
              onChangeText={setDraft}
              maxLength={150}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.modalFooter}>
              <Text style={styles.charCount}>{draft.trim().length}/150</Text>
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                  <Text style={styles.cancelBtnText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, (!draft.trim() || sending) && styles.saveBtnDisabled]}
                  onPress={handleSend}
                  disabled={!draft.trim() || sending}
                >
                  <Text style={styles.saveBtnText}>{sending ? '저금 중...' : '저금하기'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function ComplimentCard({ compliment }: { compliment: Compliment }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardText}>{compliment.text}</Text>
      <Text style={styles.cardMeta}>{formatDate(compliment.createdAt)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea:    { flex: 1, backgroundColor: colors.bg.base },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], paddingVertical: space[4], borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  backBtn:     { padding: space[1] },
  headerTitle: { ...typography.title2, color: colors.text.primary },

  jarBanner:   { alignItems: 'center', paddingVertical: space[4], gap: space[2], backgroundColor: colors.bg.surface, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  jarEmoji:    { fontSize: 36 },
  jarCount:    { ...typography.body, color: colors.text.secondary, fontFamily: 'Pretendard-SemiBold' },

  tabBar:      { flexDirection: 'row', backgroundColor: colors.bg.surface, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  tab:         { flex: 1, paddingVertical: space[3], alignItems: 'center' },
  tabActive:   { borderBottomWidth: 2, borderBottomColor: colors.accent.primary },
  tabText:     { ...typography.caption, color: colors.text.secondary },
  tabTextActive: { ...typography.caption, color: colors.accent.primary, fontFamily: 'Pretendard-SemiBold' },

  skeletonContainer: { padding: space[4], gap: space[3] },
  skeletonRow:  { height: 72, borderRadius: radius.lg },
  listContent:  { padding: space[4], gap: space[3] },

  card:         { backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[4], gap: space[2], borderWidth: 1, borderColor: colors.border.subtle },
  cardText:     { ...typography.body, color: colors.text.primary, lineHeight: 22 },
  cardMeta:     { ...typography.tiny, color: colors.text.muted },

  fab:          { position: 'absolute', right: space[5], bottom: space[6], width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent.primary, alignItems: 'center', justifyContent: 'center', shadowColor: black, shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  fabText:      { fontSize: 28, color: colors.text.inverse, lineHeight: 32 },

  backdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: space[5] },
  modalCard:    { backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[5], gap: space[4] },
  modalTitle:   { ...typography.title2, color: colors.text.primary },
  modalInput:   { ...typography.body, color: colors.text.primary, backgroundColor: colors.bg.subtle, borderRadius: radius.md, padding: space[3], minHeight: 100 },
  modalFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  charCount:    { ...typography.tiny, color: colors.text.muted },
  modalBtns:    { flexDirection: 'row', gap: space[2] },
  cancelBtn:    { paddingHorizontal: space[4], paddingVertical: space[2], borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border.subtle },
  cancelBtnText: { ...typography.caption, color: colors.text.secondary },
  saveBtn:      { paddingHorizontal: space[4], paddingVertical: space[2], borderRadius: radius.pill, backgroundColor: colors.accent.primary },
  saveBtnDisabled: { backgroundColor: colors.border.subtle },
  saveBtnText:  { ...typography.caption, color: colors.text.inverse, fontFamily: 'Pretendard-SemiBold' },
});
