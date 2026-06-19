import { router } from 'expo-router';
import { ChevronLeft, Clock, Trash2 } from 'lucide-react-native';
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

import { subscribeCouple } from '../../core/couple';
import { useAuthStore } from '../../core/stores/auth.store';
import { Spinner } from '../../design-system/Spinner';
import { useColors } from '../../design-system/ThemeContext';
import { Colors } from '../../design-system/themes';
import { radius, space, typography } from '../../design-system/tokens';
import {
  addCandidate,
  castVote,
  clearAllCandidates,
  DateCandidate,
  getVoteHistory,
  removeCandidate,
  startNewRound,
  subscribeCandidates,
  subscribeLatestSession,
  VoteSession,
} from './index';

// 예시 제안 (탭하면 입력창에 바로 들어감)
const EXAMPLES = [
  '한강 피크닉 🌅', '스시 오마카세 🍣', '노래방 🎤', '보드게임 카페 🎲',
  '드라이브 🚗', '전시회 관람 🎨', '홈파티 🍕', '방탈출 🔐',
  '영화관 🎬', '카페 투어 ☕', '마사지 💆', '새벽 편의점 🌙',
  '수영 🏊', '클라이밍 🧗', '야구 직관 ⚾', '빵집 투어 🥐',
];

type ScreenMode = 'list' | 'history';

// ─── screen ───────────────────────────────────────────────────────────────────

export default function DateDecisionScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { user, coupleId } = useAuthStore();
  const [candidates, setCandidates]     = useState<DateCandidate[]>([]);
  const [session, setSession]           = useState<VoteSession | null>(null);
  const [lastRevealed, setLastRevealed] = useState<VoteSession | null>(null);
  const [memberIds, setMemberIds]       = useState<string[]>([]);
  const [loading, setLoading]           = useState(true);
  const [mode, setMode]                 = useState<ScreenMode>('list');

  const [newTitle, setNewTitle]         = useState('');
  const [showAddForm, setShowAddForm]   = useState(false);
  const [saving, setSaving]             = useState(false);

  // 히스토리
  const [history, setHistory]           = useState<VoteSession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!coupleId) return;
    return subscribeCouple(coupleId, couple => setMemberIds(couple.memberIds as string[]));
  }, [coupleId]);

  useEffect(() => {
    if (!coupleId) return;
    return subscribeCandidates(coupleId, list => {
      setCandidates(list);
      setLoading(false);
    });
  }, [coupleId]);

  useEffect(() => {
    if (!coupleId) return;
    return subscribeLatestSession(coupleId, (inProg, rev) => {
      setSession(inProg);
      setLastRevealed(rev);
    });
  }, [coupleId]);

  const loadHistory = useCallback(async () => {
    if (!coupleId) return;
    setHistoryLoading(true);
    try {
      setHistory(await getVoteHistory(coupleId));
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  }, [coupleId]);

  useEffect(() => {
    if (mode === 'history') loadHistory();
  }, [mode, loadHistory]);

  const myUid      = user?.uid ?? '';
  const myVote     = session?.choices[myUid];
  const partnerVoted = session
    ? memberIds.some(id => id !== myUid && id in session.choices)
    : false;

  // ── handlers ────────────────────────────────────────────────────────────────

  const handleAdd = useCallback(async () => {
    if (!newTitle.trim() || !coupleId || !user || saving) return;
    setSaving(true);
    try {
      await addCandidate(coupleId, user.uid, newTitle);
      setNewTitle('');
      setShowAddForm(false);
    } catch {
      Alert.alert('오류', '후보 추가에 실패했어요');
    } finally {
      setSaving(false);
    }
  }, [newTitle, coupleId, user, saving]);

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

  const handleVote = useCallback(async (candidateId: string) => {
    if (!session || !user || myVote === candidateId) return;
    try {
      await castVote(session.id, user.uid, candidateId, memberIds);
    } catch {
      Alert.alert('오류', '투표에 실패했어요. 다시 시도해주세요');
    }
  }, [session, user, myVote, memberIds]);

  const handleStartRound = useCallback(async () => {
    if (!coupleId || saving || candidates.length === 0) return;
    setSaving(true);
    try { await startNewRound(coupleId); } catch {
      Alert.alert('오류', '라운드를 시작하지 못했어요');
    } finally { setSaving(false); }
  }, [coupleId, candidates.length, saving]);

  const handleClearAll = useCallback(() => {
    if (!coupleId || candidates.length === 0) return;
    Alert.alert(
      '전체 삭제',
      '후보 목록을 전부 지우고 새로 시작할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '전부 지우기', style: 'destructive',
          onPress: async () => {
            try { await clearAllCandidates(coupleId); } catch {
              Alert.alert('오류', '삭제에 실패했어요');
            }
          },
        },
      ],
    );
  }, [coupleId, candidates.length]);

  // ── history mode ─────────────────────────────────────────────────────────────
  if (mode === 'history') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header
          title="이전 결과"
          onBack={() => setMode('list')}
          styles={styles}
          colors={colors}
        />
        {historyLoading ? (
          <View style={styles.center}><Spinner /></View>
        ) : history.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>🗒</Text>
            <Text style={styles.emptyText}>아직 투표 결과가 없어요</Text>
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={s => s.id}
            contentContainerStyle={styles.historyList}
            renderItem={({ item: s }) => (
              <HistoryCard
                session={s}
                candidates={candidates}
                myUid={myUid}
                styles={styles}
                colors={colors}
              />
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  // ── results screen (revealed, no active session) ──────────────────────────
  if (lastRevealed && !session) {
    const rev           = lastRevealed;
    const myRevVote     = rev.choices[myUid];
    const partnerRevId  = Object.entries(rev.choices).find(([id]) => id !== myUid)?.[1];
    const isMatch       = myRevVote && partnerRevId && myRevVote === partnerRevId;
    const myCand        = candidates.find(c => c.id === myRevVote);
    const partnerCand   = candidates.find(c => c.id === partnerRevId);

    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header
          title="결과"
          onBack={() => setLastRevealed(null)}
          onHistory={() => setMode('history')}
          styles={styles}
          colors={colors}
        />
        <View style={styles.resultsContainer}>
          {isMatch ? (
            <>
              <Text style={styles.resultEmoji}>🎉</Text>
              <Text style={styles.resultTitle}>둘 다 같은 걸 골랐어요!</Text>
              <View style={styles.matchCard}>
                <Text style={styles.matchTitle}>{myCand?.title ?? '?'}</Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.resultEmoji}>🤔</Text>
              <Text style={styles.resultTitle}>아쉽게 달랐어요</Text>
              <View style={styles.noMatchRow}>
                <ResultCard label="나" title={myCand?.title} styles={styles} />
                <Text style={styles.vsText}>VS</Text>
                <ResultCard label="상대방" title={partnerCand?.title} styles={styles} />
              </View>
            </>
          )}
          <TouchableOpacity style={styles.confirmBtn} onPress={handleStartRound} disabled={saving}>
            <Text style={styles.confirmBtnText}>한 번 더 🎲</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backToListBtn} onPress={() => setLastRevealed(null)}>
            <Text style={styles.backToListText}>후보 목록으로</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── main list screen ─────────────────────────────────────────────────────────
  const iWaiting = session && myVote && !partnerVoted;

  return (
    <SafeAreaView testID="screen-date-decision" style={styles.safeArea} edges={['top']}>
      <Header
        title="둘다좋아 💑"
        onBack={() => router.back()}
        onHistory={() => setMode('history')}
        {...(candidates.length > 0 ? { onClear: handleClearAll } : {})}
        styles={styles}
        colors={colors}
      />

      {iWaiting && (
        <View style={styles.waitingBanner}>
          <Text style={styles.waitingText}>✅ 투표 완료 — 상대방 기다리는 중...</Text>
        </View>
      )}

      {session && !myVote && (
        <View style={[styles.waitingBanner, { backgroundColor: colors.accent.warm + '20' }]}>
          <Text style={[styles.waitingText, { color: colors.accent.warm }]}>
            🗳 라운드 진행 중 — 고르고 싶은 걸 탭하세요
          </Text>
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
                <Text style={styles.emptyText}>아직 후보가 없어요</Text>
                <Text style={styles.emptySubText}>아래에서 둘이 가고 싶은 곳을 추가해보세요</Text>
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
              styles={styles}
              colors={colors}
            />
          )}
          ListFooterComponent={
            <View style={styles.footer}>
              {/* 후보 추가 폼 */}
              {showAddForm ? (
                <AddForm
                  value={newTitle}
                  onChange={setNewTitle}
                  onSubmit={handleAdd}
                  onCancel={() => { setShowAddForm(false); setNewTitle(''); }}
                  saving={saving}
                  inputRef={inputRef}
                  styles={styles}
                  colors={colors}
                />
              ) : (
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => setShowAddForm(true)}
                >
                  <Text style={styles.addBtnText}>+ 후보 추가</Text>
                </TouchableOpacity>
              )}

              {!session && candidates.length > 0 && (
                <TouchableOpacity
                  style={[styles.startBtn, saving && styles.startBtnDisabled]}
                  onPress={handleStartRound}
                  disabled={saving}
                >
                  <Text style={styles.startBtnText}>
                    {saving ? '시작 중...' : '🎲 라운드 시작'}
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

// ─── add form ────────────────────────────────────────────────────────────────

function AddForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  saving,
  inputRef,
  styles,
  colors,
}: {
  value: string;
  onChange: (t: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  saving: boolean;
  inputRef: React.RefObject<TextInput | null>;
  styles: StylesType;
  colors: Colors;
}) {
  return (
    <View style={styles.addForm}>
      <TextInput
        ref={inputRef}
        style={styles.addInput}
        value={value}
        onChangeText={onChange}
        placeholder="예: 한강 피크닉, 스시 오마카세, 방탈출..."
        placeholderTextColor={colors.text.muted}
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        autoFocus
        maxLength={40}
      />

      {/* 예시 제안 칩 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.examplesScroll} contentContainerStyle={styles.examplesContent}>
        {EXAMPLES.map(ex => (
          <TouchableOpacity key={ex} style={styles.exampleChip} onPress={() => onChange(ex)}>
            <Text style={styles.exampleChipText}>{ex}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.addActions}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>취소</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSubmit}
          disabled={!value.trim() || saving}
          style={[styles.submitBtn, (!value.trim() || saving) && styles.submitBtnDisabled]}
        >
          <Text style={styles.submitBtnText}>{saving ? '추가 중...' : '추가'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── history card ─────────────────────────────────────────────────────────────

function HistoryCard({
  session,
  candidates,
  myUid,
  styles,
  colors,
}: {
  session: VoteSession;
  candidates: DateCandidate[];
  myUid: string;
  styles: StylesType;
  colors: Colors;
}) {
  const myId        = session.choices[myUid];
  const partnerId   = Object.entries(session.choices).find(([id]) => id !== myUid)?.[1];
  const myCand      = candidates.find(c => c.id === myId);
  const partnerCand = candidates.find(c => c.id === partnerId);
  const isMatch     = myId && partnerId && myId === partnerId;

  const dateStr = session.revealedAt
    ? `${session.revealedAt.getFullYear()}년 ${session.revealedAt.getMonth() + 1}월 ${session.revealedAt.getDate()}일`
    : '-';

  return (
    <View style={[styles.historyCard, isMatch && { borderColor: colors.accent.primary + '60' }]}>
      <View style={styles.historyCardHeader}>
        <Text style={styles.historyCardDate}>{dateStr}</Text>
        <Text style={[styles.historyCardMatch, { color: isMatch ? colors.accent.primary : colors.text.muted }]}>
          {isMatch ? '🎉 매치!' : '🤔 불일치'}
        </Text>
      </View>
      <View style={styles.historyCardBody}>
        <View style={styles.historyChoice}>
          <Text style={styles.historyChoiceLabel}>나</Text>
          <Text style={styles.historyChoiceTitle} numberOfLines={1}>
            {myCand?.title ?? '삭제된 항목'}
          </Text>
        </View>
        {!isMatch && (
          <>
            <Text style={styles.vsText}>VS</Text>
            <View style={styles.historyChoice}>
              <Text style={styles.historyChoiceLabel}>상대방</Text>
              <Text style={styles.historyChoiceTitle} numberOfLines={1}>
                {partnerCand?.title ?? '삭제된 항목'}
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

// ─── header ───────────────────────────────────────────────────────────────────

type StylesType = ReturnType<typeof makeStyles>;

function Header({
  title,
  onBack,
  onHistory,
  onClear,
  styles,
  colors,
}: {
  title: string;
  onBack: () => void;
  onHistory?: () => void;
  onClear?: () => void;
  styles: StylesType;
  colors: Colors;
}) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="뒤로 가기">
        <ChevronLeft size={24} color={colors.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerRight}>
        {onClear && (
          <TouchableOpacity onPress={onClear} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="전체 삭제">
            <Trash2 size={20} color={colors.text.muted} />
          </TouchableOpacity>
        )}
        {onHistory && (
          <TouchableOpacity onPress={onHistory} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="이전 결과">
            <Clock size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        )}
        {!onHistory && !onClear && <View style={{ width: 36 }} />}
      </View>
    </View>
  );
}

// ─── candidate row ────────────────────────────────────────────────────────────

function CandidateRow({
  candidate, isSelected, sessionActive, onVote, onDelete, styles, colors,
}: {
  candidate: DateCandidate;
  isSelected: boolean;
  sessionActive: boolean;
  onVote: () => void;
  onDelete: () => void;
  styles: StylesType;
  colors: Colors;
}) {
  return (
    <TouchableOpacity
      style={[styles.candidateRow, isSelected && styles.candidateRowSelected]}
      onPress={sessionActive ? onVote : undefined}
      activeOpacity={sessionActive ? 0.7 : 1}
    >
      <Text style={[styles.candidateTitle, isSelected && styles.candidateTitleSelected]} numberOfLines={1}>
        {candidate.title}
      </Text>
      {isSelected ? (
        <View style={styles.selectedBadge}>
          <Text style={styles.selectedBadgeText}>내 선택 ✓</Text>
        </View>
      ) : !sessionActive ? (
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="후보 삭제">
          <Trash2 size={18} color={colors.text.muted} />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

// ─── result card ──────────────────────────────────────────────────────────────

function ResultCard({ label, title, styles }: { label: string; title: string | undefined; styles: StylesType }) {
  return (
    <View style={styles.resultCard}>
      <Text style={styles.resultCardLabel}>{label}</Text>
      <Text style={styles.resultCardTitle} numberOfLines={2}>{title ?? '선택 없음'}</Text>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const makeStyles = (colors: Colors) => StyleSheet.create({
  safeArea:              { flex: 1, backgroundColor: colors.bg.base },
  flex:                  { flex: 1 },
  center:                { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3] },

  header:                { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], paddingVertical: space[4], borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  backBtn:               { padding: space[1], width: 36 },
  headerTitle:           { ...typography.title2, color: colors.text.primary, flex: 1, textAlign: 'center' },
  headerRight:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: space[1], minWidth: 36 },
  iconBtn:               { padding: space[2] },

  waitingBanner:         { backgroundColor: colors.accent.primary + '20', paddingHorizontal: space[4], paddingVertical: space[3] },
  waitingText:           { ...typography.caption, color: colors.accent.primary },

  listContent:           { padding: space[4], gap: space[2], paddingBottom: space[8] },

  candidateRow:          { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg.surface, borderRadius: radius.md, paddingHorizontal: space[4], paddingVertical: space[4], borderWidth: 1.5, borderColor: 'transparent', gap: space[2] },
  candidateRowSelected:  { borderColor: colors.accent.primary, backgroundColor: colors.accent.primary + '10' },
  candidateTitle:        { ...typography.bodyBold, color: colors.text.primary, flex: 1 },
  candidateTitleSelected:{ color: colors.accent.primary },
  selectedBadge:         { backgroundColor: colors.accent.primary, borderRadius: radius.pill, paddingHorizontal: space[3], paddingVertical: space[1] },
  selectedBadgeText:     { ...typography.tiny, color: colors.text.inverse },
  deleteBtn:             { padding: space[2] },

  empty:                 { paddingVertical: space[10], alignItems: 'center', gap: space[2] },
  emptyIcon:             { fontSize: 36 },
  emptyText:             { ...typography.bodyBold, color: colors.text.muted },
  emptySubText:          { ...typography.caption, color: colors.text.muted, textAlign: 'center' },

  footer:                { marginTop: space[4], gap: space[4] },

  addBtn:                { paddingVertical: space[3], alignItems: 'center' },
  addBtnText:            { ...typography.body, color: colors.accent.primary },

  addForm:               { backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[4], gap: space[3] },
  addInput:              { ...typography.body, color: colors.text.primary, backgroundColor: colors.bg.subtle, borderRadius: radius.md, paddingHorizontal: space[4], paddingVertical: space[3] },

  examplesScroll:        { marginHorizontal: -space[1] },
  examplesContent:       { gap: space[2], paddingHorizontal: space[1] },
  exampleChip:           { backgroundColor: colors.bg.subtle, borderRadius: radius.pill, paddingHorizontal: space[3], paddingVertical: space[2], borderWidth: 1, borderColor: colors.border.subtle },
  exampleChipText:       { ...typography.caption, color: colors.text.secondary },

  addActions:            { flexDirection: 'row', justifyContent: 'flex-end', gap: space[3] },
  cancelBtn:             { paddingVertical: space[2], paddingHorizontal: space[3] },
  cancelBtnText:         { ...typography.body, color: colors.text.muted },
  submitBtn:             { backgroundColor: colors.accent.primary, borderRadius: radius.md, paddingVertical: space[2], paddingHorizontal: space[5] },
  submitBtnDisabled:     { backgroundColor: colors.border.subtle },
  submitBtnText:         { ...typography.bodyBold, color: colors.text.inverse },

  startBtn:              { backgroundColor: colors.accent.primary, borderRadius: radius.lg, paddingVertical: space[4], alignItems: 'center' },
  startBtnDisabled:      { opacity: 0.6 },
  startBtnText:          { ...typography.bodyBold, color: colors.text.inverse },

  // results
  resultsContainer:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[6], gap: space[5] },
  resultEmoji:           { fontSize: 64 },
  resultTitle:           { ...typography.title1, color: colors.text.primary, textAlign: 'center' },
  matchCard:             { backgroundColor: colors.bg.surface, borderRadius: radius.xl, padding: space[6], alignItems: 'center', width: '100%', borderWidth: 2, borderColor: colors.accent.primary },
  matchTitle:            { ...typography.title1, color: colors.accent.primary, textAlign: 'center' },
  noMatchRow:            { flexDirection: 'row', gap: space[3], alignItems: 'center', width: '100%' },
  vsText:                { ...typography.bodyBold, color: colors.text.muted },
  resultCard:            { flex: 1, backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[4], alignItems: 'center', gap: space[1] },
  resultCardLabel:       { ...typography.tiny, color: colors.text.muted },
  resultCardTitle:       { ...typography.bodyBold, color: colors.text.primary, textAlign: 'center' },
  confirmBtn:            { backgroundColor: colors.accent.primary, borderRadius: radius.lg, paddingVertical: space[4], paddingHorizontal: space[8] },
  confirmBtnText:        { ...typography.bodyBold, color: colors.text.inverse },
  backToListBtn:         { paddingVertical: space[2] },
  backToListText:        { ...typography.caption, color: colors.text.muted },

  // history
  historyList:           { padding: space[4], gap: space[3], paddingBottom: space[8] },
  historyCard:           { backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[4], gap: space[3], borderWidth: 1.5, borderColor: 'transparent' },
  historyCardHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyCardDate:       { ...typography.caption, color: colors.text.muted },
  historyCardMatch:      { ...typography.caption, fontFamily: 'Pretendard-SemiBold' },
  historyCardBody:       { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  historyChoice:         { flex: 1, gap: 2 },
  historyChoiceLabel:    { ...typography.tiny, color: colors.text.muted },
  historyChoiceTitle:    { ...typography.bodyBold, color: colors.text.primary },
});
