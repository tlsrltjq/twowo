import { router } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { db } from '../../core/config/firebase';
import { Couple,subscribeCouple } from '../../core/couple';
import { useAuthStore } from '../../core/stores/auth.store';
import { Skeleton } from '../../design-system/Skeleton';
import { black, colors, radius, space, typography } from '../../design-system/tokens';
import {
deleteFood,   FoodLog,   logFood, MEAL_EMOJI, MEAL_LABEL, MEAL_TYPES,
MealType, subscribeTodayFood, suggestMealType,
} from './index';

function formatDate(d: Date): string {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function DailyFoodScreen() {
  const { user, coupleId }        = useAuthStore();
  const [couple, setCouple]       = useState<Couple | null>(null);
  const [logs, setLogs]           = useState<FoodLog[] | null>(null);
  const [partnerName, setPartnerName] = useState('상대방');
  const [modalVisible, setModal]  = useState(false);
  const [mealType, setMealType]   = useState<MealType>(suggestMealType());
  const [name, setName]           = useState('');
  const [saving, setSaving]       = useState(false);

  const partnerUid = couple?.memberIds.find((id: string) => id !== user?.uid) ?? null;

  useEffect(() => {
    if (!coupleId) return;
    return subscribeCouple(coupleId, setCouple);
  }, [coupleId]);

  useEffect(() => {
    if (!coupleId) return;
    return subscribeTodayFood(coupleId, setLogs);
  }, [coupleId]);

  useEffect(() => {
    if (!partnerUid) return;
    getDoc(doc(db, 'users', partnerUid)).then(snap => {
      const displayName = snap.data()?.displayName as string | undefined;
      if (displayName) setPartnerName(displayName);
    });
  }, [partnerUid]);

  const myLogs      = logs?.filter(l => l.userId === user?.uid)      ?? [];
  const partnerLogs = logs?.filter(l => l.userId === partnerUid)     ?? [];

  const handleSave = async () => {
    if (!coupleId || !user || saving) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await logFood(coupleId, user.uid, mealType, trimmed);
      setName('');
      setModal(false);
    } catch (e: unknown) {
      Alert.alert('오류', e instanceof Error ? e.message : '다시 시도해주세요');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (log: FoodLog) => {
    if (log.userId !== user?.uid) return;
    Alert.alert('삭제', `"${log.name}" 기록을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => deleteFood(log.id) },
    ]);
  };

  const openModal = () => {
    setMealType(suggestMealType());
    setName('');
    setModal(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ChevronLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>오늘 뭐 먹었어?</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={styles.dateLabel}>{formatDate(new Date())}</Text>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* 상대방 */}
          <Text style={styles.sectionLabel}>💬 {partnerName}의 기록</Text>
          {logs === null ? (
            <View style={styles.skeletonGroup}>
              {[0, 1].map(i => <Skeleton key={i} style={styles.skeletonRow} />)}
            </View>
          ) : partnerLogs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>아직 기록이 없어요</Text>
            </View>
          ) : (
            partnerLogs.map(log => (
              <FoodCard key={log.id} log={log} onDelete={undefined} />
            ))
          )}

          {/* 나 */}
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionLabel, styles.sectionLabelMy]}>✏️ 내 기록</Text>
            {myLogs.length > 0 && (
              <Text style={styles.deleteHint}>길게 누르면 삭제</Text>
            )}
          </View>
          {logs === null ? (
            <View style={styles.skeletonGroup}>
              {[0, 1].map(i => <Skeleton key={i} style={styles.skeletonRow} />)}
            </View>
          ) : myLogs.length === 0 ? (
            <TouchableOpacity style={styles.addCard} onPress={openModal}>
              <Text style={styles.addCardText}>+ 오늘 뭐 먹었어?</Text>
            </TouchableOpacity>
          ) : (
            myLogs.map(log => (
              <FoodCard key={log.id} log={log} onDelete={() => handleDelete(log)} />
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* FAB */}
      <Pressable style={styles.fab} onPress={openModal} accessibilityLabel="식사 기록 추가">
        <Text style={styles.fabText}>＋</Text>
      </Pressable>

      {/* 입력 모달 */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>뭐 먹었어? 🍽️</Text>

            {/* 식사 타입 선택 */}
            <View style={styles.mealTypePicker}>
              {MEAL_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.mealTypeBtn, mealType === t && styles.mealTypeBtnActive]}
                  onPress={() => setMealType(t)}
                >
                  <Text style={styles.mealTypeEmoji}>{MEAL_EMOJI[t]}</Text>
                  <Text style={[styles.mealTypeLabel, mealType === t && styles.mealTypeLabelActive]}>
                    {MEAL_LABEL[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="메뉴 이름을 입력하세요"
              placeholderTextColor={colors.text.muted}
              value={name}
              onChangeText={setName}
              maxLength={50}
              returnKeyType="done"
              onSubmitEditing={handleSave}
              autoFocus
            />

            <View style={styles.modalFooter}>
              <Text style={styles.charCount}>{name.trim().length}/50</Text>
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                  <Text style={styles.cancelBtnText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, (!name.trim() || saving) && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={!name.trim() || saving}
                >
                  <Text style={styles.saveBtnText}>{saving ? '기록 중...' : '기록하기'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function FoodCard({
  log,
  onDelete,
}: {
  log: FoodLog;
  onDelete: (() => void) | undefined;
}) {
  return (
    <TouchableOpacity
      style={styles.card}
      onLongPress={onDelete}
      activeOpacity={onDelete ? 0.7 : 1}
      delayLongPress={400}
    >
      <View style={styles.cardLeft}>
        <Text style={styles.cardEmoji}>{MEAL_EMOJI[log.mealType]}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardMealType}>{MEAL_LABEL[log.mealType]}</Text>
        <Text style={styles.cardName}>{log.name}</Text>
      </View>
      <Text style={styles.cardTime}>{formatTime(log.loggedAt)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea:       { flex: 1, backgroundColor: colors.bg.base },
  flex:           { flex: 1 },

  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], paddingVertical: space[4], borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  backBtn:        { padding: space[1] },
  headerTitle:    { ...typography.title2, color: colors.text.primary },

  dateLabel:      { ...typography.caption, color: colors.text.muted, textAlign: 'center', paddingVertical: space[2], backgroundColor: colors.bg.surface, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },

  body:           { padding: space[4], gap: space[3], paddingBottom: space[10] },

  sectionRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel:   { ...typography.caption, color: colors.text.muted, fontFamily: 'Pretendard-SemiBold', letterSpacing: 0.5 },
  sectionLabelMy: {},
  deleteHint:     { ...typography.tiny, color: colors.text.muted },

  skeletonGroup:  { gap: space[2] },
  skeletonRow:    { height: 56, borderRadius: radius.md },

  emptyCard:      { backgroundColor: colors.bg.subtle, borderRadius: radius.md, padding: space[4], alignItems: 'center' },
  emptyText:      { ...typography.caption, color: colors.text.muted },

  addCard:        { backgroundColor: colors.bg.subtle, borderRadius: radius.md, padding: space[4], alignItems: 'center', borderWidth: 1, borderColor: colors.border.subtle, borderStyle: 'dashed' },
  addCardText:    { ...typography.body, color: colors.accent.primary },

  card:           { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg.surface, borderRadius: radius.md, padding: space[3], gap: space[3], borderWidth: 1, borderColor: colors.border.subtle },
  cardLeft:       { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.bg.subtle, alignItems: 'center', justifyContent: 'center' },
  cardEmoji:      { fontSize: 18 },
  cardBody:       { flex: 1 },
  cardMealType:   { ...typography.tiny, color: colors.text.muted },
  cardName:       { ...typography.bodyBold, color: colors.text.primary },
  cardTime:       { ...typography.tiny, color: colors.text.muted },

  fab:            { position: 'absolute', right: space[5], bottom: space[6], width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent.primary, alignItems: 'center', justifyContent: 'center', shadowColor: black, shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  fabText:        { fontSize: 28, color: colors.text.inverse, lineHeight: 32 },

  backdrop:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: space[5] },
  modalCard:      { backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[5], gap: space[4] },
  modalTitle:     { ...typography.title2, color: colors.text.primary },

  mealTypePicker: { flexDirection: 'row', gap: space[2] },
  mealTypeBtn:    { flex: 1, alignItems: 'center', paddingVertical: space[3], borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.subtle, gap: space[1] },
  mealTypeBtnActive: { borderColor: colors.accent.primary, backgroundColor: colors.accent.primary + '15' },
  mealTypeEmoji:  { fontSize: 18 },
  mealTypeLabel:  { ...typography.tiny, color: colors.text.secondary },
  mealTypeLabelActive: { color: colors.accent.primary, fontFamily: 'Pretendard-SemiBold' },

  modalInput:     { ...typography.body, color: colors.text.primary, backgroundColor: colors.bg.subtle, borderRadius: radius.md, padding: space[3] },
  modalFooter:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  charCount:      { ...typography.tiny, color: colors.text.muted },
  modalBtns:      { flexDirection: 'row', gap: space[2] },
  cancelBtn:      { paddingHorizontal: space[4], paddingVertical: space[2], borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border.subtle },
  cancelBtnText:  { ...typography.caption, color: colors.text.secondary },
  saveBtn:        { paddingHorizontal: space[4], paddingVertical: space[2], borderRadius: radius.pill, backgroundColor: colors.accent.primary },
  saveBtnDisabled: { backgroundColor: colors.border.subtle },
  saveBtnText:    { ...typography.caption, color: colors.text.inverse, fontFamily: 'Pretendard-SemiBold' },
});
