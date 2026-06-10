import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, RefreshCw } from 'lucide-react-native';

import { useAuthStore } from '../../core/stores/auth.store';
import { Spinner } from '../../design-system/Spinner';
import { colors, radius, space, typography } from '../../design-system/tokens';
import {
  BingoBoard,
  DEFAULT_BINGO_ITEMS,
  getBingoCells,
  startBoard,
  subscribeActiveBoard,
  toggleCell,
} from './index';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_PAD  = space[4];
const CELL_GAP  = 4;
const CELL_SIZE = Math.floor((SCREEN_W - GRID_PAD * 2 - CELL_GAP * 4) / 5);

// ─── main screen ──────────────────────────────────────────────────────────────

export default function BingoScreen() {
  const { user, coupleId }  = useAuthStore();
  const [board, setBoard]   = useState<BingoBoard | null | 'loading'>('loading');
  const [mode, setMode]     = useState<'game' | 'setup'>('game');

  // 이전 completedLines 추적 → 새 빙고 감지 (BR-5/BR-7)
  const prevLinesRef = useRef<number[]>([]);

  useEffect(() => {
    if (!coupleId) return;
    return subscribeActiveBoard(coupleId, b => {
      if (b && board !== 'loading' && typeof board === 'object' && board !== null) {
        // 새로 완성된 라인 감지
        const newLines = b.completedLines.filter(l => !prevLinesRef.current.includes(l));
        if (newLines.length > 0) {
          Alert.alert('🎉 빙고!', `빙고 ${newLines.length}줄을 완성했어요!`);
        }
        if (b.status === 'completed' && board.status !== 'completed') {
          Alert.alert('🏆 완성!', '빙고판을 모두 채웠어요! 새 판을 시작해볼까요?');
        }
      }
      prevLinesRef.current = b?.completedLines ?? [];
      setBoard(b);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId]);

  const handleToggle = useCallback(async (index: number) => {
    if (!board || board === 'loading' || !user) return;
    try {
      await toggleCell(board.id, user.uid, index);
    } catch {
      Alert.alert('오류', '다시 시도해주세요');
    }
  }, [board, user]);

  const handleStartSetup = () => setMode('setup');

  if (board === 'loading') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header onBack={() => router.back()} onNewBoard={undefined} />
        <View style={styles.center}><Spinner /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        onBack={() => router.back()}
        onNewBoard={board ? handleStartSetup : undefined}
      />

      {mode === 'setup' || !board ? (
        <SetupView
          coupleId={coupleId!}
          onStarted={() => setMode('game')}
          onCancel={board ? () => setMode('game') : undefined}
        />
      ) : (
        <GameView board={board} myUid={user?.uid ?? ''} onToggle={handleToggle} />
      )}
    </SafeAreaView>
  );
}

// ─── header ───────────────────────────────────────────────────────────────────

function Header({
  onBack,
  onNewBoard,
}: {
  onBack: () => void;
  onNewBoard: (() => void) | undefined;
}) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <ChevronLeft size={24} color={colors.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>데이트 빙고 🎯</Text>
      {onNewBoard ? (
        <TouchableOpacity onPress={onNewBoard} style={styles.newBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <RefreshCw size={20} color={colors.accent.primary} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 36 }} />
      )}
    </View>
  );
}

// ─── setup view ───────────────────────────────────────────────────────────────

function SetupView({
  coupleId,
  onStarted,
  onCancel,
}: {
  coupleId: string;
  onStarted: () => void;
  onCancel: (() => void) | undefined;
}) {
  const [items, setItems] = useState<string[]>([...DEFAULT_BINGO_ITEMS]);
  const [saving, setSaving] = useState(false);

  const allFilled = items.every(t => t.trim().length > 0);

  const handleFillDefault = () => setItems([...DEFAULT_BINGO_ITEMS]);

  const handleEdit = (i: number, text: string) => {
    setItems(prev => { const next = [...prev]; next[i] = text; return next; });
  };

  const handleStart = async () => {
    if (!allFilled || saving) return;
    if (items.some(t => t.trim().length > 50)) {
      Alert.alert('오류', '항목은 50자 이내로 입력해주세요 (BR-8)');
      return;
    }
    setSaving(true);
    try {
      await startBoard(coupleId, items.map(t => t.trim()));
      onStarted();
    } catch {
      Alert.alert('오류', '빙고판 시작에 실패했어요');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.flex}>
      <View style={styles.setupToolbar}>
        <Text style={styles.setupHint}>25개 항목을 채우세요 ({items.filter(t => t.trim()).length}/25)</Text>
        <TouchableOpacity onPress={handleFillDefault} style={styles.fillBtn}>
          <Text style={styles.fillBtnText}>기본으로 채우기</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.setupList}
        renderItem={({ item, index }) => (
          <View style={styles.setupRow}>
            <Text style={styles.setupNum}>{index + 1}</Text>
            <TextInput
              style={styles.setupInput}
              value={item}
              onChangeText={text => handleEdit(index, text)}
              placeholder={`항목 ${index + 1}`}
              placeholderTextColor={colors.text.muted}
              maxLength={50}
              returnKeyType="next"
            />
          </View>
        )}
      />

      <View style={styles.setupFooter}>
        {onCancel && (
          <TouchableOpacity onPress={onCancel} style={styles.cancelSetupBtn}>
            <Text style={styles.cancelSetupText}>취소</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.startBtn, (!allFilled || saving) && styles.startBtnDisabled]}
          onPress={handleStart}
          disabled={!allFilled || saving}
        >
          <Text style={styles.startBtnText}>{saving ? '시작 중...' : '빙고판 시작!'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── game view ────────────────────────────────────────────────────────────────

function GameView({
  board,
  myUid,
  onToggle,
}: {
  board: BingoBoard;
  myUid: string;
  onToggle: (index: number) => void;
}) {
  const checkedCount = Object.keys(board.checkedItems).length;
  const bingoCells = useMemo(() => getBingoCells(board.completedLines), [board.completedLines]);

  return (
    <ScrollView contentContainerStyle={styles.gameContainer} showsVerticalScrollIndicator={false}>
      {/* 진행률 */}
      <View style={styles.progress}>
        <Text style={styles.progressText}>{checkedCount} / 25 완료</Text>
        {board.completedLines.length > 0 && (
          <Text style={styles.progressBingo}>🎯 빙고 {board.completedLines.length}줄!</Text>
        )}
      </View>

      {/* 5x5 그리드 */}
      <View style={styles.grid}>
        {board.items.map((item, idx) => {
          const key = String(idx);
          const isChecked = key in board.checkedItems;
          const isBingo   = bingoCells.has(idx);
          const checkedByMe = board.checkedBy[key]?.uid === myUid;

          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.cell,
                isChecked && styles.cellChecked,
                isBingo   && styles.cellBingo,
              ]}
              onPress={() => onToggle(idx)}
              activeOpacity={0.7}
            >
              <Text style={[styles.cellText, isChecked && styles.cellTextChecked]} numberOfLines={3}>
                {item}
              </Text>
              {isChecked && (
                <Text style={styles.cellCheck}>{checkedByMe ? '✓' : '✔'}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {board.status === 'completed' && (
        <View style={styles.completedBanner}>
          <Text style={styles.completedText}>🏆 빙고판 완성! 새 판을 시작해보세요 (우상단 ↺)</Text>
        </View>
      )}
    </ScrollView>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea:          { flex: 1, backgroundColor: colors.bg.base },
  flex:              { flex: 1 },
  center:            { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], paddingVertical: space[4], borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  backBtn:           { padding: space[1] },
  headerTitle:       { ...typography.title2, color: colors.text.primary },
  newBtn:            { padding: space[2] },

  // setup
  setupToolbar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], paddingVertical: space[3] },
  setupHint:         { ...typography.caption, color: colors.text.muted },
  fillBtn:           { paddingHorizontal: space[3], paddingVertical: space[2], backgroundColor: colors.bg.subtle, borderRadius: radius.pill },
  fillBtnText:       { ...typography.caption, color: colors.accent.primary },
  setupList:         { paddingHorizontal: space[4], gap: space[2], paddingBottom: space[4] },
  setupRow:          { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  setupNum:          { ...typography.caption, color: colors.text.muted, width: 24, textAlign: 'right' },
  setupInput:        { flex: 1, ...typography.body, color: colors.text.primary, backgroundColor: colors.bg.surface, borderRadius: radius.md, paddingHorizontal: space[3], paddingVertical: space[3], borderWidth: 1, borderColor: colors.border.subtle },
  setupFooter:       { flexDirection: 'row', gap: space[3], padding: space[4], borderTopWidth: 1, borderTopColor: colors.border.subtle },
  cancelSetupBtn:    { flex: 1, paddingVertical: space[4], alignItems: 'center', borderRadius: radius.lg, backgroundColor: colors.bg.subtle },
  cancelSetupText:   { ...typography.bodyBold, color: colors.text.secondary },
  startBtn:          { flex: 2, paddingVertical: space[4], alignItems: 'center', borderRadius: radius.lg, backgroundColor: colors.accent.primary },
  startBtnDisabled:  { backgroundColor: colors.border.subtle },
  startBtnText:      { ...typography.bodyBold, color: colors.text.inverse },

  // game
  gameContainer:     { padding: GRID_PAD, gap: space[4], paddingBottom: space[8] },
  progress:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressText:      { ...typography.caption, color: colors.text.muted },
  progressBingo:     { ...typography.caption, color: colors.accent.warm, fontFamily: 'Pretendard-SemiBold' },

  grid:              { flexDirection: 'row', flexWrap: 'wrap', gap: CELL_GAP },

  cell:              {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  cellChecked:       { backgroundColor: colors.accent.primary, borderColor: colors.accent.primary },
  cellBingo:         { backgroundColor: colors.accent.warm, borderColor: colors.accent.warm },
  cellText:          { ...typography.tiny, color: colors.text.secondary, textAlign: 'center', lineHeight: 14 },
  cellTextChecked:   { color: colors.text.inverse, fontFamily: 'Pretendard-SemiBold' },
  cellCheck:         { position: 'absolute', top: 2, right: 4, fontSize: 10, color: 'rgba(255,255,255,0.8)' },

  completedBanner:   { backgroundColor: colors.accent.warm + '25', borderRadius: radius.lg, padding: space[4] },
  completedText:     { ...typography.body, color: colors.accent.warm, textAlign: 'center' },
});
