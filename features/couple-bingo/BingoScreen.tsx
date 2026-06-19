import { router } from 'expo-router';
import { ChevronLeft, Clock, RefreshCw } from 'lucide-react-native';
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

import { useAuthStore } from '../../core/stores/auth.store';
import { Spinner } from '../../design-system/Spinner';
import { useColors } from '../../design-system/ThemeContext';
import { Colors } from '../../design-system/themes';
import { radius, space, typography } from '../../design-system/tokens';
import {
  BingoBoard,
  DEFAULT_BINGO_ITEMS,
  getBingoCells,
  getBoardHistory,
  startBoard,
  subscribeActiveBoard,
  toggleCell,
} from './index';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_PAD  = space[4];
const CELL_GAP  = 4;
const CELL_SIZE = Math.floor((SCREEN_W - GRID_PAD * 2 - CELL_GAP * 4) / 5);

type ScreenMode = 'game' | 'setup' | 'history' | 'history-detail';

// ─── main screen ──────────────────────────────────────────────────────────────

export default function BingoScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { user, coupleId }  = useAuthStore();
  const [board, setBoard]   = useState<BingoBoard | null | 'loading'>('loading');
  const [mode, setMode]     = useState<ScreenMode>('game');

  const [historyBoards, setHistoryBoards]   = useState<BingoBoard[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedBoard, setSelectedBoard]   = useState<BingoBoard | null>(null);
  const [setupFromHistory, setSetupFromHistory] = useState(false);

  // 이전 completedLines 추적 → 새 빙고 감지 (BR-5/BR-7)
  const prevLinesRef = useRef<number[]>([]);

  useEffect(() => {
    if (!coupleId) return;
    return subscribeActiveBoard(coupleId, b => {
      if (b && board !== 'loading' && typeof board === 'object' && board !== null) {
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

  const loadHistory = useCallback(async () => {
    if (!coupleId) return;
    setHistoryLoading(true);
    try {
      const boards = await getBoardHistory(coupleId);
      setHistoryBoards(boards);
    } catch {
      // ignore — empty list shown
    } finally {
      setHistoryLoading(false);
    }
  }, [coupleId]);

  useEffect(() => {
    if (mode === 'history') loadHistory();
  }, [mode, loadHistory]);

  const handleToggle = useCallback(async (index: number) => {
    if (!board || board === 'loading' || !user) return;
    try {
      await toggleCell(board.id, user.uid, index);
    } catch {
      Alert.alert('오류', '다시 시도해주세요');
    }
  }, [board, user]);

  const handleStartSetup = (fromHistory = false) => {
    setSetupFromHistory(fromHistory);
    setMode('setup');
  };

  const handleCancelSetup = () => {
    setMode(setupFromHistory ? 'history' : board ? 'game' : 'history');
  };

  const handleSelectHistory = (b: BingoBoard) => {
    setSelectedBoard(b);
    setMode('history-detail');
  };

  if (board === 'loading') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header
          onBack={() => router.back()}
          styles={styles}
          colors={colors}
        />
        <View style={styles.center}><Spinner /></View>
      </SafeAreaView>
    );
  }

  const headerTitle = mode === 'history' ? '이전 기록'
    : mode === 'history-detail' ? '완료된 빙고판'
    : '데이트 빙고 🎯';

  const headerOnBack = mode === 'history-detail'
    ? () => setMode('history')
    : mode === 'history'
    ? () => setMode(board ? 'game' : 'history')
    : () => router.back();

  const headerOnNewBoard = mode !== 'setup'
    ? () => handleStartSetup(mode === 'history' || mode === 'history-detail')
    : undefined;

  const headerOnHistory = (mode === 'game' || (!board && mode !== 'history'))
    ? () => setMode('history')
    : undefined;

  return (
    <SafeAreaView testID="screen-bingo" style={styles.safeArea} edges={['top']}>
      <Header
        onBack={headerOnBack}
        title={headerTitle}
        styles={styles}
        colors={colors}
        {...(headerOnNewBoard !== undefined ? { onNewBoard: headerOnNewBoard } : {})}
        {...(headerOnHistory !== undefined ? { onHistory: headerOnHistory } : {})}
      />

      {mode === 'history' ? (
        <HistoryView
          boards={historyBoards}
          loading={historyLoading}
          onSelectBoard={handleSelectHistory}
          styles={styles}
          colors={colors}
        />
      ) : mode === 'history-detail' && selectedBoard ? (
        <HistoryDetailView
          board={selectedBoard}
          styles={styles}
        />
      ) : mode === 'setup' || !board ? (
        <SetupView
          coupleId={coupleId!}
          onStarted={() => setMode('game')}
          onCancel={board || setupFromHistory ? handleCancelSetup : undefined}
          styles={styles}
          colors={colors}
        />
      ) : (
        <GameView board={board} myUid={user?.uid ?? ''} onToggle={handleToggle} styles={styles} />
      )}
    </SafeAreaView>
  );
}

// ─── header ───────────────────────────────────────────────────────────────────

type StylesType = ReturnType<typeof makeStyles>;

function Header({
  onBack,
  onNewBoard,
  onHistory,
  title = '데이트 빙고 🎯',
  styles,
  colors,
}: {
  onBack: () => void;
  onNewBoard?: () => void;
  onHistory?: () => void;
  title?: string;
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
        {onHistory && (
          <TouchableOpacity onPress={onHistory} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="이전 기록">
            <Clock size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        )}
        {onNewBoard && (
          <TouchableOpacity onPress={onNewBoard} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="새 빙고 시작">
            <RefreshCw size={20} color={colors.accent.primary} />
          </TouchableOpacity>
        )}
        {!onHistory && !onNewBoard && <View style={{ width: 44 }} />}
      </View>
    </View>
  );
}

// ─── history view ─────────────────────────────────────────────────────────────

function HistoryView({
  boards,
  loading,
  onSelectBoard,
  styles,
  colors,
}: {
  boards: BingoBoard[];
  loading: boolean;
  onSelectBoard: (b: BingoBoard) => void;
  styles: StylesType;
  colors: Colors;
}) {
  if (loading) {
    return <View style={styles.center}><Spinner /></View>;
  }

  if (boards.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>아직 완성된 빙고판이 없어요</Text>
        <Text style={styles.emptySub}>빙고판을 완성하면 여기에 기록이 남아요</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={boards}
      keyExtractor={b => b.id}
      contentContainerStyle={styles.historyList}
      renderItem={({ item: b, index }) => {
        const checkedCount = Object.keys(b.checkedItems).length;
        const completedDate = b.completedAt
          ? formatDate(b.completedAt)
          : b.startedAt ? formatDate(b.startedAt) : '-';
        return (
          <TouchableOpacity style={styles.historyCard} onPress={() => onSelectBoard(b)} activeOpacity={0.7}>
            <View style={styles.historyCardLeft}>
              <Text style={styles.historyNum}>#{boards.length - index}</Text>
              <View>
                <Text style={styles.historyDate}>{completedDate}</Text>
                <Text style={styles.historyStats}>
                  {checkedCount}/25 완성 · 빙고 {b.completedLines.length}줄
                </Text>
              </View>
            </View>
            <View style={styles.historyMiniGrid}>
              {b.items.slice(0, 9).map((_, idx) => {
                const isChecked = String(idx) in b.checkedItems;
                return (
                  <View
                    key={idx}
                    style={[
                      styles.miniCell,
                      isChecked && { backgroundColor: colors.accent.primary },
                    ]}
                  />
                );
              })}
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

// ─── history detail view ──────────────────────────────────────────────────────

function HistoryDetailView({
  board,
  styles,
}: {
  board: BingoBoard;
  styles: StylesType;
}) {
  const checkedCount = Object.keys(board.checkedItems).length;
  const bingoCells = useMemo(() => getBingoCells(board.completedLines), [board.completedLines]);
  const completedDate = board.completedAt ? formatDate(board.completedAt) : '-';

  return (
    <ScrollView contentContainerStyle={styles.gameContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.progress}>
        <Text style={styles.progressText}>{completedDate} 완료</Text>
        <Text style={styles.progressText}>{checkedCount}/25 · 빙고 {board.completedLines.length}줄</Text>
      </View>

      <View style={styles.grid}>
        {board.items.map((item, idx) => {
          const key = String(idx);
          const isChecked = key in board.checkedItems;
          const isBingo   = bingoCells.has(idx);
          return (
            <View
              key={idx}
              style={[
                styles.cell,
                isChecked && styles.cellChecked,
                isBingo   && styles.cellBingo,
                styles.cellReadOnly,
              ]}
            >
              <Text style={[styles.cellText, isChecked && styles.cellTextChecked]} numberOfLines={3}>
                {item}
              </Text>
              {isChecked && <Text style={styles.cellCheck}>✓</Text>}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── setup view ───────────────────────────────────────────────────────────────

function SetupView({
  coupleId,
  onStarted,
  onCancel,
  styles,
  colors,
}: {
  coupleId: string;
  onStarted: () => void;
  onCancel: (() => void) | undefined;
  styles: StylesType;
  colors: Colors;
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
  styles,
}: {
  board: BingoBoard;
  myUid: string;
  onToggle: (index: number) => void;
  styles: StylesType;
}) {
  const checkedCount = Object.keys(board.checkedItems).length;
  const bingoCells = useMemo(() => getBingoCells(board.completedLines), [board.completedLines]);

  return (
    <ScrollView contentContainerStyle={styles.gameContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.progress}>
        <Text style={styles.progressText}>{checkedCount} / 25 완료</Text>
        {board.completedLines.length > 0 && (
          <Text style={styles.progressBingo}>🎯 빙고 {board.completedLines.length}줄!</Text>
        )}
      </View>

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

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// ─── styles ───────────────────────────────────────────────────────────────────

const makeStyles = (colors: Colors) => StyleSheet.create({
  safeArea:          { flex: 1, backgroundColor: colors.bg.base },
  flex:              { flex: 1 },
  center:            { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3] },

  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], paddingVertical: space[4], borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  backBtn:           { padding: space[1], width: 36 },
  headerTitle:       { ...typography.title2, color: colors.text.primary, flex: 1, textAlign: 'center' },
  headerRight:       { flexDirection: 'row', alignItems: 'center', width: 72, justifyContent: 'flex-end' },
  iconBtn:           { padding: space[2] },

  emptyTitle:        { ...typography.bodyBold, color: colors.text.primary },
  emptySub:          { ...typography.caption, color: colors.text.muted, textAlign: 'center' },

  // history list
  historyList:       { padding: space[4], gap: space[3], paddingBottom: space[8] },
  historyCard:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bg.surface, borderRadius: radius.lg, padding: space[4], gap: space[3] },
  historyCardLeft:   { flexDirection: 'row', alignItems: 'center', gap: space[3], flex: 1 },
  historyNum:        { ...typography.title2, color: colors.accent.primary, minWidth: 32 },
  historyDate:       { ...typography.bodyBold, color: colors.text.primary },
  historyStats:      { ...typography.caption, color: colors.text.muted, marginTop: 2 },
  historyMiniGrid:   { flexDirection: 'row', flexWrap: 'wrap', width: 36, gap: 2 },
  miniCell:          { width: 10, height: 10, borderRadius: 2, backgroundColor: colors.border.subtle },

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
  cellReadOnly:      { opacity: 0.9 },
  cellText:          { ...typography.tiny, color: colors.text.secondary, textAlign: 'center', lineHeight: 14 },
  cellTextChecked:   { color: colors.text.inverse, fontFamily: 'Pretendard-SemiBold' },
  cellCheck:         { position: 'absolute', top: 2, right: 4, fontSize: 10, color: 'rgba(255,255,255,0.8)' },

  completedBanner:   { backgroundColor: colors.accent.warm + '25', borderRadius: radius.lg, padding: space[4] },
  completedText:     { ...typography.body, color: colors.accent.warm, textAlign: 'center' },
});
