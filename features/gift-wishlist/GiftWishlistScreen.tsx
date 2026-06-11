import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import {
  WishlistItem,
  addWishlistItem,
  toggleReceived,
  deleteWishlistItem,
  subscribeWishlist,
} from './index';

type ViewTab = 'partner' | 'mine';

export default function GiftWishlistScreen() {
  const { user, coupleId }        = useAuthStore();
  const [couple, setCouple]       = useState<Couple | null>(null);
  const [all, setAll]             = useState<WishlistItem[] | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>('partner');
  const [modalVisible, setModal]  = useState(false);
  const [name, setName]           = useState('');
  const [memo, setMemo]           = useState('');
  const [price, setPrice]         = useState('');
  const [saving, setSaving]       = useState(false);

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
    return subscribeWishlist(coupleId, setAll);
  }, [coupleId]);

  const partnerItems = all?.filter(i => i.addedBy === partnerUid) ?? [];
  const myItems      = all?.filter(i => i.addedBy === user?.uid)  ?? [];
  const displayed    = activeTab === 'partner' ? partnerItems : myItems;

  const handleSave = async () => {
    if (!coupleId || !user || saving) return;
    setSaving(true);
    try {
      await addWishlistItem(coupleId, user.uid, name, memo || undefined, price || undefined);
      setName(''); setMemo(''); setPrice('');
      setModal(false);
    } catch (e: unknown) {
      Alert.alert('오류', e instanceof Error ? e.message : '다시 시도해주세요');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleReceived = (item: WishlistItem) => {
    toggleReceived(item.id, !item.received);
  };

  const handleDelete = (item: WishlistItem) => {
    Alert.alert('삭제', `"${item.name}" 을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => deleteWishlistItem(item.id) },
    ]);
  };

  const openModal = () => { setName(''); setMemo(''); setPrice(''); setModal(true); };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ChevronLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>선물 위시리스트</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* 탭 */}
      <View style={styles.tabBar}>
        {([
          { key: 'partner' as ViewTab, label: `🎁 ${partnerName} 위시리스트` },
          { key: 'mine'    as ViewTab, label: '✏️ 내 목록' },
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

      {/* 내 목록 롱프레스 힌트 */}
      {activeTab === 'mine' && myItems.length > 0 && (
        <View style={styles.hintBar}>
          <Text style={styles.hintText}>길게 누르면 삭제할 수 있어요</Text>
        </View>
      )}

      {/* 목록 */}
      {all === null ? (
        <View style={styles.skeletonContainer}>
          {[0, 1, 2].map(i => <Skeleton key={i} style={styles.skeletonRow} />)}
        </View>
      ) : displayed.length === 0 ? (
        <EmptyState
          title={activeTab === 'partner' ? '상대방 목록이 비어있어요' : '내 목록이 비어있어요'}
          description={activeTab === 'partner' ? `${partnerName}이(가) 원하는 것을 기다리고 있어요` : '+ 버튼으로 갖고 싶은 것을 추가해보세요'}
        />
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <WishlistCard
              item={item}
              showReceiveBtn={activeTab === 'partner'}
              canDelete={item.addedBy === user?.uid}
              onToggleReceived={() => handleToggleReceived(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}

      {/* FAB — 내 탭에서만 */}
      {activeTab === 'mine' && (
        <Pressable style={styles.fab} onPress={openModal} accessibilityLabel="위시 추가">
          <Text style={styles.fabText}>＋</Text>
        </Pressable>
      )}

      {/* 입력 모달 */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={() => setModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>갖고 싶은 것 추가 🎀</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>이름 *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="에어팟, 향수, 책..."
                placeholderTextColor={colors.text.muted}
                value={name}
                onChangeText={setName}
                maxLength={60}
                autoFocus
              />
              <Text style={styles.charCount}>{name.trim().length}/60</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>가격대 (선택)</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="~10만원대"
                placeholderTextColor={colors.text.muted}
                value={price}
                onChangeText={setPrice}
                maxLength={30}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>메모 (선택)</Text>
              <TextInput
                style={[styles.fieldInput, styles.memoInput]}
                placeholder="색상, 사이즈, 브랜드 등..."
                placeholderTextColor={colors.text.muted}
                value={memo}
                onChangeText={setMemo}
                maxLength={100}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (!name.trim() || saving) && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!name.trim() || saving}
              >
                <Text style={styles.saveBtnText}>{saving ? '추가 중...' : '추가하기'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function WishlistCard({
  item,
  showReceiveBtn,
  canDelete,
  onToggleReceived,
  onDelete,
}: {
  item: WishlistItem;
  showReceiveBtn: boolean;
  canDelete: boolean;
  onToggleReceived: () => void;
  onDelete: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, item.received && styles.cardReceived]}
      onLongPress={canDelete ? onDelete : undefined}
      delayLongPress={400}
      activeOpacity={0.85}
    >
      <View style={styles.cardBody}>
        <Text style={[styles.cardName, item.received && styles.cardNameDone]}>{item.name}</Text>
        {item.priceRange && (
          <Text style={styles.cardPrice}>{item.priceRange}</Text>
        )}
        {item.memo && (
          <Text style={styles.cardMemo} numberOfLines={2}>{item.memo}</Text>
        )}
      </View>
      {showReceiveBtn && (
        <TouchableOpacity
          style={[styles.receiveBtn, item.received && styles.receiveBtnDone]}
          onPress={onToggleReceived}
        >
          <Text style={[styles.receiveBtnText, item.received && styles.receiveBtnTextDone]}>
            {item.received ? '✅ 받았어' : '받았어!'}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
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
  tabText:     { ...typography.caption, color: colors.text.secondary },
  tabTextActive: { ...typography.caption, color: colors.accent.primary, fontFamily: 'Pretendard-SemiBold' },

  hintBar:      { paddingHorizontal: space[4], paddingVertical: space[2] },
  hintText:     { ...typography.tiny, color: colors.text.muted },

  skeletonContainer: { padding: space[4], gap: space[3] },
  skeletonRow:  { height: 72, borderRadius: radius.lg },
  listContent:  { padding: space[4], gap: space[3], paddingBottom: space[10] },

  card:         { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[4], gap: space[3], borderWidth: 1, borderColor: colors.border.subtle },
  cardReceived: { opacity: 0.6, backgroundColor: colors.bg.subtle },
  cardBody:     { flex: 1, gap: 2 },
  cardName:     { ...typography.bodyBold, color: colors.text.primary },
  cardNameDone: { textDecorationLine: 'line-through', color: colors.text.muted },
  cardPrice:    { ...typography.caption, color: colors.accent.primary },
  cardMemo:     { ...typography.caption, color: colors.text.secondary },

  receiveBtn:     { paddingHorizontal: space[3], paddingVertical: space[2], borderRadius: radius.pill, backgroundColor: colors.bg.subtle, borderWidth: 1, borderColor: colors.border.subtle },
  receiveBtnDone: { backgroundColor: colors.accent.primary + '20', borderColor: colors.accent.primary },
  receiveBtnText: { ...typography.tiny, color: colors.text.secondary, fontFamily: 'Pretendard-SemiBold' },
  receiveBtnTextDone: { color: colors.accent.primary },

  fab:          { position: 'absolute', right: space[5], bottom: space[6], width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent.primary, alignItems: 'center', justifyContent: 'center', shadowColor: black, shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  fabText:      { fontSize: 28, color: colors.text.inverse, lineHeight: 32 },

  backdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: space[5] },
  modalCard:    { backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[5], gap: space[4] },
  modalTitle:   { ...typography.title2, color: colors.text.primary },

  fieldGroup:   { gap: space[1] },
  fieldLabel:   { ...typography.caption, color: colors.text.secondary, fontFamily: 'Pretendard-SemiBold' },
  fieldInput:   { ...typography.body, color: colors.text.primary, backgroundColor: colors.bg.subtle, borderRadius: radius.md, paddingHorizontal: space[3], paddingVertical: space[3] },
  memoInput:    { minHeight: 72, textAlignVertical: 'top' },
  charCount:    { ...typography.tiny, color: colors.text.muted, alignSelf: 'flex-end' },

  modalBtns:    { flexDirection: 'row', gap: space[2], justifyContent: 'flex-end' },
  cancelBtn:    { paddingHorizontal: space[4], paddingVertical: space[2], borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border.subtle },
  cancelBtnText: { ...typography.caption, color: colors.text.secondary },
  saveBtn:      { paddingHorizontal: space[4], paddingVertical: space[2], borderRadius: radius.pill, backgroundColor: colors.accent.primary },
  saveBtnDisabled: { backgroundColor: colors.border.subtle },
  saveBtnText:  { ...typography.caption, color: colors.text.inverse, fontFamily: 'Pretendard-SemiBold' },
});
