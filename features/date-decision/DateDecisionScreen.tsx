import { router } from 'expo-router';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { subscribeCouple } from '../../core/couple';
import { useAuthStore } from '../../core/stores/auth.store';
import { colors, radius, space, typography } from '../../design-system/tokens';
import {
  addCandidate,
  castVote,
  CATEGORY_LABELS,
  DateCandidate,
  removeCandidate,
  startNewRound,
  subscribeCandidates,
  subscribeLatestSession,
  VoteCategory,
  VoteSession,
} from './index';

const CATEGORIES: VoteCategory[] = ['food', 'activity', 'travel', 'etc'];

// ─── screen ───────────────────────────────────────────────────────────────────

export default function DateDecisionScreen() {
  const { user, coupleId } = useAuthStore();
  const [candidates, setCandidates]       = useState<DateCandidate[]>([]);
  const [session, setSession]             = useState<VoteSession | null>(null);
  const [lastRevealed, setLastRevealed]   = useState<VoteSession | null>(null);
  const [memberIds, setMemberIds]         = useState<string[]>([]);
  const [loading, setLoading]             = useState(true);

  const [newTitle, setNewTitle]           = useState('');
  const [newCategory, setNewCategory]     = useState<VoteCategory>('food');
  const [showAddForm, setShowAddForm]     = useState(false);
  const [saving, setSaving]              = useState(false);

  const inputRef = useRef<TextInput>(null);

  // 커플 memberIds 구독
  useEffect(() => {
    if (!coupleId) return;
    return subscribeCouple(coupleId, couple => setMemberIds(couple.memberIds as string[]));
  }, [coupleId]);

  // 후보 목록 구독
  useEffect(() => {
    if (!coupleId) return;
    return subscribeCandidates(coupleId, list => {
      setCandidates(list);
      setLoading(false);
    });
  }, [coupleId]);

  // 세션 구독
  useEffect(() => {
    if (!coupleId) return;
    return subscribeLatestSession(coupleId, (inProg, rev) => {
      setSession(inProg);
      setLastRevealed(rev);
    });
  }, [coupleId]);

  const myUid   = user?.uid ?? '';
  const myVote  = session?.choices[myUid];
  const partnerVoted = session
    ? memberIds.some(id => id !== myUid && id in session.choices)
    : false;

  // 후보 추가
  const handleAdd = useCallback(async () => {
    if (!newTitle.trim() || !coupleId || !user || saving) return;
    setSaving(true);
    try {
      await addCandidate(coupleId, user.uid, newTitle, newCategory);
      setNewTitle('');
      setShowAddForm(false);
    } catch {
      Alert.alert('오류', '후보 추가에 실패했어요');
    } finally {
      setSaving(false);
    }
  }, [newTitle, newCategory, coupleId, user, saving]);

  // 후보 삭제
  const handleDelete = useCallback((candidate: DateCandidate) => {
    Alert.alert(
      '후보 삭제',
      `"${candidate.title}"을 삭제할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제', style: 'destructive',
          onPress: async () => {
            try { await removeCandidate(candidate.id); } catch {
              Alert.alert('오류', '삭제에 실패했어요');
            }
          },
        },
      ],
    );
  }, []);

  // 투표
  const handleVote = useCallback(async (candidateId: string) => {
    if (!session || !user) return;
    // 이미 같은 후보 선택 시 무시
    if (myVote === candidateId) return;
    try {
      await castVote(session.id, user.uid, candidateId, memberIds);
    } catch {
      Alert.alert('오류', '투표에 실패했어요. 다시 시도해주세요');
    }
  }, [session, user, myVote, memberIds]);

  // 새 라운드
  const handleNewRound = useCallback(async () => {
    if (!coupleId || saving) return;
    if (candidates.length === 0) {
      Alert.alert('후보 없음', '먼저 후보를 추가해주세요');
      return;
    }
    setSaving(true);
    try {
      await startNewRound(coupleId);
    } catch {
      Alert.alert('오류', '새 라운드를 시작하지 못했어요');
    } finally {
      setSaving(false);
    }
  }, [coupleId, candidates.length, saving]);

  // ─── 결과 화면 ───────────────────────────────────────────────────────────────
  const showResults = lastRevealed && !session;
  if (showResults) {
    const rev = lastRevealed;
    const myRevVote    = rev.choices[myUid];
    const partnerRevId = Object.entries(rev.choices).find(([id]) => id !== myUid)?.[1];
    const isMatch = myRevVote && partnerRevId && myRevVote === partnerRevId;

    const myCand     = candidates.find(c => c.id === myRevVote);
    const partnerCand = candidates.find(c => c.id === partnerRevId);

    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header />
        <View style={styles.resultsContainer}>
          {isMatch ? (
            <>
              <Text style={styles.resultEmoji}>🎉</Text>
              <Text style={styles.resultTitle}>같은 걸 골랐어요!</Text>
              <View style={styles.matchCard}>
                <Text style={styles.matchCategory}>{CATEGORY_LABELS[myCand?.category ?? 'etc']}</Text>
                <Text style={styles.matchTitle}>{myCand?.title ?? '?'}</Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.resultEmoji}>🤔</Text>
              <Text style={styles.resultTitle}>아쉽게 달랐어요</Text>
              <View style={styles.noMatchRow}>
                <VoteResultCard label="나" candidate={myCand} />
                <Text style={styles.vsText}>VS</Text>
                <VoteResultCard label="상대방" candidate={partnerCand} />
              </View>
            </>
          )}
          <TouchableOpacity style={styles.newRoundBtn} onPress={handleNewRound} disabled={saving}>
            <Text style={styles.newRoundBtnText}>다시 하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── 대기 화면 (내가 투표했고 상대방 대기 중) ─────────────────────────────────
  const iWaiting = session && myVote && !partnerVoted && session.status === 'in_progress';

  // ─── 메인 화면 ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header />

      {/* 세션 상태 배너 */}
      {iWaiting && (
        <View style={styles.waitingBanner}>
          <Text style={styles.waitingText}>✅ 투표 완료 — 상대방 기다리는 중...</Text>
        </View>
      )}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={candidates}
          keyExtractor={c => c.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            loading ? null : (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🗒</Text>
                <Text style={styles.emptyText}>후보를 추가해보세요</Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <CandidateRow
              candidate={item}
              isSelected={myVote === item.id}
              sessionActive={!!session}
              onVote={() => handleVote(item.id)}
              onDelete={() => handleDelete(item)}
            />
          )}
          ListFooterComponent={
            <View style={styles.footer}>
              {/* 후보 추가 폼 */}
              {showAddForm ? (
                <View style={styles.addForm}>
                  <TextInput
                    ref={inputRef}
                    style={styles.addInput}
                    value={newTitle}
                    onChangeText={setNewTitle}
                    placeholder="후보 이름 (예: 스시집 삼청동)"
                    placeholderTextColor={colors.text.muted}
                    returnKeyType="done"
                    onSubmitEditing={handleAdd}
                    autoFocus
                    maxLength={40}
                  />
                  {/* 카테고리 */}
                  <View style={styles.categoryRow}>
                    {CATEGORIES.map(cat => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.catChip, newCategory === cat && styles.catChipActive]}
                        onPress={() => setNewCategory(cat)}
                      >
                        <Text style={[styles.catChipText, newCategory === cat && styles.catChipTextActive]}>
                          {CATEGORY_LABELS[cat]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.addActions}>
                    <TouchableOpacity onPress={() => setShowAddForm(false)} style={styles.cancelBtn}>
                      <Text style={styles.cancelBtnText}>취소</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleAdd}
                      disabled={!newTitle.trim() || saving}
                      style={[styles.confirmBtn, (!newTitle.trim() || saving) && styles.confirmBtnDisabled]}
                    >
                      <Text style={styles.confirmBtnText}>{saving ? '추가 중...' : '추가'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.addBtn} onPress={() => { setShowAddForm(true); }}>
                  <Plus size={18} color={colors.accent.primary} />
                  <Text style={styles.addBtnText}>후보 추가</Text>
                </TouchableOpacity>
              )}

              {/* 새 라운드 / 현재 세션 없으면 시작 버튼 */}
              {!session && candidates.length > 0 && (
                <TouchableOpacity
                  style={[styles.startBtn, saving && styles.startBtnDisabled]}
                  onPress={handleNewRound}
                  disabled={saving}
                >
                  <Text style={styles.startBtnText}>
                    {saving ? '시작 중...' : '라운드 시작 🎲'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

function Header() {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="뒤로 가기">
        <ChevronLeft size={24} color={colors.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>둘다좋아 💑</Text>
    </View>
  );
}

function CandidateRow({
  candidate, isSelected, sessionActive, onVote, onDelete,
}: {
  candidate: DateCandidate;
  isSelected: boolean;
  sessionActive: boolean;
  onVote: () => void;
  onDelete: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.candidateRow, isSelected && styles.candidateRowSelected]}
      onPress={sessionActive ? onVote : undefined}
      activeOpacity={sessionActive ? 0.7 : 1}
    >
      <View style={styles.candidateInfo}>
        <Text style={styles.candidateCategory}>{CATEGORY_LABELS[candidate.category]}</Text>
        <Text style={[styles.candidateTitle, isSelected && styles.candidateTitleSelected]}>
          {candidate.title}
        </Text>
      </View>
      {isSelected && (
        <View style={styles.selectedBadge}>
          <Text style={styles.selectedBadgeText}>내 선택 ✓</Text>
        </View>
      )}
      {!sessionActive && (
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="후보 삭제">
          <Trash2 size={18} color={colors.text.muted} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

function VoteResultCard({ label, candidate }: { label: string; candidate: DateCandidate | undefined }) {
  return (
    <View style={styles.resultCard}>
      <Text style={styles.resultCardLabel}>{label}</Text>
      {candidate ? (
        <>
          <Text style={styles.resultCardCategory}>{CATEGORY_LABELS[candidate.category]}</Text>
          <Text style={styles.resultCardTitle}>{candidate.title}</Text>
        </>
      ) : (
        <Text style={styles.resultCardEmpty}>선택 없음</Text>
      )}
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea:              { flex: 1, backgroundColor: colors.bg.base },
  flex:                  { flex: 1 },

  header:                { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[4], borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  backBtn:               { padding: space[1] },
  headerTitle:           { ...typography.title2, color: colors.text.primary },

  waitingBanner:         { backgroundColor: colors.accent.primary + '20', paddingHorizontal: space[4], paddingVertical: space[3] },
  waitingText:           { ...typography.caption, color: colors.accent.primary },

  listContent:           { padding: space[4], gap: space[2], paddingBottom: space[8] },

  candidateRow:          { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg.surface, borderRadius: radius.md, padding: space[4], borderWidth: 1.5, borderColor: 'transparent' },
  candidateRowSelected:  { borderColor: colors.accent.primary, backgroundColor: colors.accent.primary + '10' },
  candidateInfo:         { flex: 1, gap: 2 },
  candidateCategory:     { ...typography.tiny, color: colors.text.muted },
  candidateTitle:        { ...typography.bodyBold, color: colors.text.primary },
  candidateTitleSelected:{ color: colors.accent.primary },
  selectedBadge:         { backgroundColor: colors.accent.primary, borderRadius: radius.pill, paddingHorizontal: space[3], paddingVertical: space[1] },
  selectedBadgeText:     { ...typography.tiny, color: colors.text.inverse },
  deleteBtn:             { padding: space[2] },

  empty:                 { paddingVertical: space[10], alignItems: 'center', gap: space[3] },
  emptyIcon:             { fontSize: 36 },
  emptyText:             { ...typography.body, color: colors.text.muted },

  footer:                { marginTop: space[4], gap: space[4] },

  addBtn:                { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: space[3], justifyContent: 'center' },
  addBtnText:            { ...typography.body, color: colors.accent.primary },
  addForm:               { backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[4], gap: space[3] },
  addInput:              { ...typography.body, color: colors.text.primary, backgroundColor: colors.bg.subtle, borderRadius: radius.md, paddingHorizontal: space[4], paddingVertical: space[3] },
  categoryRow:           { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  catChip:               { paddingVertical: space[2], paddingHorizontal: space[3], borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border.subtle },
  catChipActive:         { borderColor: colors.accent.primary, backgroundColor: colors.accent.primary + '15' },
  catChipText:           { ...typography.caption, color: colors.text.secondary },
  catChipTextActive:     { color: colors.accent.primary, fontFamily: 'Pretendard-SemiBold' },
  addActions:            { flexDirection: 'row', justifyContent: 'flex-end', gap: space[3] },
  cancelBtn:             { paddingVertical: space[2], paddingHorizontal: space[3] },
  cancelBtnText:         { ...typography.body, color: colors.text.muted },
  confirmBtn:            { backgroundColor: colors.accent.primary, borderRadius: radius.md, paddingVertical: space[2], paddingHorizontal: space[5] },
  confirmBtnDisabled:    { backgroundColor: colors.border.subtle },
  confirmBtnText:        { ...typography.bodyBold, color: colors.text.inverse },

  startBtn:              { backgroundColor: colors.accent.primary, borderRadius: radius.lg, paddingVertical: space[4], alignItems: 'center' },
  startBtnDisabled:      { opacity: 0.6 },
  startBtnText:          { ...typography.bodyBold, color: colors.text.inverse },

  // results
  resultsContainer:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[6], gap: space[5] },
  resultEmoji:           { fontSize: 64 },
  resultTitle:           { ...typography.title1, color: colors.text.primary, textAlign: 'center' },
  matchCard:             { backgroundColor: colors.bg.surface, borderRadius: radius.xl, padding: space[6], alignItems: 'center', gap: space[2], width: '100%', borderWidth: 2, borderColor: colors.accent.primary },
  matchCategory:         { ...typography.caption, color: colors.text.muted },
  matchTitle:            { ...typography.title1, color: colors.accent.primary, textAlign: 'center' },
  noMatchRow:            { flexDirection: 'row', gap: space[3], alignItems: 'center' },
  vsText:                { ...typography.bodyBold, color: colors.text.muted },
  resultCard:            { flex: 1, backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[4], alignItems: 'center', gap: space[1] },
  resultCardLabel:       { ...typography.tiny, color: colors.text.muted },
  resultCardCategory:    { ...typography.tiny, color: colors.text.muted },
  resultCardTitle:       { ...typography.bodyBold, color: colors.text.primary, textAlign: 'center' },
  resultCardEmpty:       { ...typography.caption, color: colors.text.muted },
  newRoundBtn:           { backgroundColor: colors.accent.primary, borderRadius: radius.lg, paddingVertical: space[4], paddingHorizontal: space[8], marginTop: space[3] },
  newRoundBtnText:       { ...typography.bodyBold, color: colors.text.inverse },
});
