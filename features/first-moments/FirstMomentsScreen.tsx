import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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

import { useAuthStore } from '../../core/stores/auth.store';
import { EmptyState } from '../../design-system/EmptyState';
import { Skeleton } from '../../design-system/Skeleton';
import { colors, radius, space, typography } from '../../design-system/tokens';
import { FirstMoment, addFirstMoment, deleteFirstMoment, subscribeFirstMoments } from './index';
import { getTodayKST } from '../../core/utils/date';

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

export default function FirstMomentsScreen() {
  const { user, coupleId }        = useAuthStore();
  const [moments, setMoments]     = useState<FirstMoment[] | null>(null);
  const [modalVisible, setModal]  = useState(false);
  const [title, setTitle]         = useState('');
  const [date, setDate]           = useState(getTodayKST());
  const [memo, setMemo]           = useState('');
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (!coupleId) return;
    return subscribeFirstMoments(coupleId, setMoments);
  }, [coupleId]);

  const handleSave = async () => {
    if (!coupleId || !user || saving) return;
    setSaving(true);
    try {
      await addFirstMoment(coupleId, user.uid, title, date, memo || undefined);
      setTitle(''); setDate(getTodayKST()); setMemo('');
      setModal(false);
    } catch (e: any) {
      Alert.alert('오류', e.message ?? '다시 시도해주세요');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (m: FirstMoment) => {
    if (m.addedBy !== user?.uid) return;
    Alert.alert('삭제', `"${m.title}" 기록을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => deleteFirstMoment(m.id) },
    ]);
  };

  const canSave = title.trim().length > 0 && date.length === 10 && !saving;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ChevronLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>우리가 처음 한 것들</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* 요약 배너 */}
      <View style={styles.banner}>
        <Text style={styles.bannerEmoji}>🌟</Text>
        <Text style={styles.bannerText}>
          {moments === null ? '...' : `총 ${moments.length}개의 처음`}
        </Text>
      </View>

      {/* 목록 */}
      {moments === null ? (
        <View style={styles.skeletonContainer}>
          {[0, 1, 2].map(i => <Skeleton key={i} style={styles.skeletonRow} />)}
        </View>
      ) : moments.length === 0 ? (
        <EmptyState
          title="아직 기록이 없어요"
          description="처음 함께 한 것들을 기록해보세요"
        />
      ) : (
        <FlatList
          data={moments}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <MomentCard
              moment={item}
              isOwner={item.addedBy === user?.uid}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}

      {/* FAB */}
      <Pressable style={styles.fab} onPress={() => setModal(true)} accessibilityLabel="처음 기록 추가">
        <Text style={styles.fabText}>＋</Text>
      </Pressable>

      {/* 입력 모달 */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>새로운 처음 기록하기 ✨</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>어떤 처음이에요?</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="처음 여행 간 날, 처음 같이 밥 먹은 날..."
                placeholderTextColor={colors.text.muted}
                value={title}
                onChangeText={setTitle}
                maxLength={60}
                autoFocus
              />
              <Text style={styles.charCount}>{title.trim().length}/60</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>언제였어요?</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.text.muted}
                value={date}
                onChangeText={setDate}
                maxLength={10}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>메모 (선택)</Text>
              <TextInput
                style={[styles.fieldInput, styles.memoInput]}
                placeholder="기억에 남는 것들을 적어두세요"
                placeholderTextColor={colors.text.muted}
                value={memo}
                onChangeText={setMemo}
                maxLength={100}
                multiline
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{memo.trim().length}/100</Text>
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!canSave}
              >
                <Text style={styles.saveBtnText}>{saving ? '기록 중...' : '기록하기'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function MomentCard({
  moment,
  isOwner,
  onDelete,
}: {
  moment: FirstMoment;
  isOwner: boolean;
  onDelete: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.card}
      onLongPress={isOwner ? onDelete : undefined}
      delayLongPress={400}
      activeOpacity={0.85}
    >
      <View style={styles.cardLeft}>
        <Text style={styles.cardEmoji}>✨</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{moment.title}</Text>
        <Text style={styles.cardDate}>{formatDisplayDate(moment.date)}</Text>
        {moment.memo && (
          <Text style={styles.cardMemo} numberOfLines={2}>{moment.memo}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea:    { flex: 1, backgroundColor: colors.bg.base },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], paddingVertical: space[4], borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  backBtn:     { padding: space[1] },
  headerTitle: { ...typography.title2, color: colors.text.primary },

  banner:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2], paddingVertical: space[3], backgroundColor: colors.bg.surface, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  bannerEmoji: { fontSize: 20 },
  bannerText:  { ...typography.body, color: colors.text.secondary, fontFamily: 'Pretendard-SemiBold' },

  skeletonContainer: { padding: space[4], gap: space[3] },
  skeletonRow:  { height: 72, borderRadius: radius.lg },

  listContent:  { padding: space[4], gap: space[3], paddingBottom: space[10] },

  card:         { flexDirection: 'row', backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[4], gap: space[3], borderWidth: 1, borderColor: colors.border.subtle },
  cardLeft:     { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.bg.subtle, alignItems: 'center', justifyContent: 'center' },
  cardEmoji:    { fontSize: 18 },
  cardBody:     { flex: 1, gap: 2 },
  cardTitle:    { ...typography.bodyBold, color: colors.text.primary },
  cardDate:     { ...typography.caption, color: colors.accent.primary },
  cardMemo:     { ...typography.caption, color: colors.text.secondary, marginTop: 2 },

  fab:          { position: 'absolute', right: space[5], bottom: space[6], width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent.primary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
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
