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
  completeBoard,
  getBingoCells,
  getBoardHistory,
  startBoard,
  subscribeActiveBoards,
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

  const { user, coupleId } = useAuthStore();

  const [boards, setBoards]       = useState<BingoBoard[] | 'loading'>('loading');
  const [activeIdx, setActiveIdx] = useState(0);
  const [mode, setMode]           = useState<ScreenMode>('game');

  const [historyBoards, setHistoryBoards]   = useState<BingoBoard[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedBoard, setSelectedBoard]   = useState<BingoBoard | null>(null);
  const [setupFromHistory, setSetupFromHistory] = useState(false);

  // boardId → completedLines 추적 (BR-5 새 라인 감지)
  const prevLinesRef = useRef<Record<string, number[]>>({});

  useEffect(() => {
    if (!coupleId) return;
    return subscribeActiveBoards(coupleId, incoming => {
      setBoards(prev => {
        const prevArr = prev === 'loading' ? [] : prev;

        incoming.forEach(b => {
          const prev = prevLinesRef.current[b.id] ?? [];
          const newLines = b.completedLines.filter(l => !prev.includes(l));
          if (newLines.length > 0 && prevArr.length > 0) {
            Alert.alert('🎉 빙고!', `빙고 ${newLines.length}줄을 완성했어요!`);
          }
          const prevBoard = prevArr.find(pb => pb.id === b.id);
          if (b.status === 'completed' && prevBoard?.status !== 'completed') {
            Alert.alert('🏆 완성!', '빙고판을 모두 채웠어요!');
          }
          prevLinesRef.current[b.id] = b.completedLines;
        });

        return incoming;
      });

      // activeIdx 범위 보정
      setActiveIdx(prev => (incoming.length === 0 ? 0 : Math.min(prev, incoming.length - 1)));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId]);

  const activeBoards = boards === 'loading' ? [] : boards;
  const board = activeBoards[activeIdx] ?? null;

  const loadHistory = useCallback(async () => {
    if (!coupleId) return;
    setHistoryLoading(true);
    try {
      const list = await getBoardHistory(coupleId);
      setHistoryBoards(list);
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  }, [coupleId]);

  useEffect(() => {
    if (mode === 'history') loadHistory();
  }, [mode, loadHistory]);

  const handleToggle = useCallback(async (index: number) => {
    if (!board || !user) return;
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
    setMode(setupFromHistory ? 'history' : activeBoards.length > 0 ? 'game' : 'history');
  };

  const handleComplete = () => {
    if (!board) return;
    Alert.alert(
      '기록으로 넘기기',
      '미완성 항목이 있어도 지금까지의 기록을 저장하고 완료 처리합니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '기록으로 넘기기',
          onPress: async () => {
            try {
              await completeBoard(board.id);
              setMode('history');
            } catch {
              Alert.alert('오류', '다시 시도해주세요');
            }
          },
        },
      ],
    );
  };

  const handleSelectHistory = (b: BingoBoard) => {
    setSelectedBoard(b);
    setMode('history-detail');
  };

  if (boards === 'loading') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header onBack={() => router.back()} styles={styles} colors={colors} />
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
    ? () => setMode('game')
    : () => router.back();

  // 이미 history/history-detail에 있으면 Clock 아이콘 숨김
  const headerOnHistory = mode !== 'history' && mode !== 'history-detail'
    ? () => setMode('history')
    : undefined;

  const headerOnNewBoard = mode !== 'setup' && activeBoards.length < 3
    ? () => handleStartSetup(mode === 'history' || mode === 'history-detail')
    : undefined;

  return (
    <SafeAreaView testID="screen-bingo" style={styles.safeArea} edges={['top']}>
      <Header
        onBack={headerOnBack}
        title={headerTitle}
        styles={styles}
        colors={colors}
        {...(headerOnHistory !== undefined ? { onHistory: headerOnHistory } : {})}
        {...(headerOnNewBoard !== undefined ? { onNewBoard: headerOnNewBoard } : {})}
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
        <HistoryDetailView board={selectedBoard} styles={styles} />
      ) : mode === 'setup' ? (
        <SetupView
          coupleId={coupleId!}
          onStarted={() => {
            setActiveIdx(activeBoards.length); // 새 보드는 마지막에 추가됨
            setMode('game');
          }}
          onCancel={handleCancelSetup}
          styles={styles}
          colors={colors}
        />
      ) : activeBoards.length === 0 ? (
        <EmptyState onNew={() => handleStartSetup()} onHistory={() => setMode('history')} styles={styles} colors={colors} />
      ) : (
        <View style={styles.flex}>
          {activeBoards.length > 1 && (
            <BoardTabs
              boards={activeBoards}
              activeIdx={activeIdx}
              onSelect={setActiveIdx}
              styles={styles}
              colors={colors}
            />
          )}
          <GameView
            board={board!}
            myUid={user?.uid ?? ''}
            onToggle={handleToggle}
            onComplete={handleComplete}
            styles={styles}
          />
        </View>
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

// ─── empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  onNew,
  onHistory,
  styles,
  colors,
}: {
  onNew: () => void;
  onHistory: () => void;
  styles: StylesType;
  colors: Colors;
}) {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>진행 중인 빙고판이 없어요</Text>
      <Text style={styles.emptySub}>새 빙고판을 만들어 커플과 함께 도전해보세요!</Text>
      <TouchableOpacity testID="btn-empty-new" style={styles.emptyNewBtn} onPress={onNew}>
        <Text style={styles.emptyNewBtnText}>새 빙고판 만들기</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="btn-empty-history" onPress={onHistory} style={styles.emptyHistBtn}>
        <Text style={[styles.emptySub, { color: colors.accent.primary }]}>이전 기록 보기</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── board tabs ───────────────────────────────────────────────────────────────

function BoardTabs({
  boards,
  activeIdx,
  onSelect,
  styles,
  colors,
}: {
  boards: BingoBoard[];
  activeIdx: number;
  onSelect: (i: number) => void;
  styles: StylesType;
  colors: Colors;
}) {
  return (
    <View style={styles.tabBar}>
      {boards.map((b, i) => {
        const checked = Object.keys(b.checkedItems).length;
        const isActive = i === activeIdx;
        return (
          <TouchableOpacity
            key={b.id}
            testID={`btn-tab-${i + 1}`}
            style={[styles.tab, isActive && { borderBottomColor: colors.accent.primary }]}
            onPress={() => onSelect(i)}
          >
            <Text style={[styles.tabLabel, isActive && { color: colors.accent.primary, fontFamily: 'Pretendard-SemiBold' }]}>
              빙고 {i + 1}
            </Text>
            <Text style={[styles.tabProgress, isActive && { color: colors.accent.primary }]}>
              {checked}/25
            </Text>
          </TouchableOpacity>
        );
      })}
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
        const completedDate = b.completedAt ? formatDate(b.completedAt) : '-';
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
              {b.items.slice(0, 9).map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.miniCell,
                    (String(idx) in b.checkedItems) && { backgroundColor: colors.accent.primary },
                  ]}
                />
              ))}
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

// ─── history detail view ──────────────────────────────────────────────────────

function HistoryDetailView({ board, styles }: { board: BingoBoard; styles: StylesType }) {
  const checkedCount = Object.keys(board.checkedItems).length;
  const bingoCells = useMemo(() => getBingoCells(board.completedLines), [board.completedLines]);

  return (
    <ScrollView contentContainerStyle={styles.gameContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.progress}>
        <Text style={styles.progressText}>{board.completedAt ? formatDate(board.completedAt) : '-'} 완료</Text>
        <Text style={styles.progressText}>{checkedCount}/25 · 빙고 {board.completedLines.length}줄</Text>
      </View>
      <View style={styles.grid}>
        {board.items.map((item, idx) => {
          const key = String(idx);
          const isChecked = key in board.checkedItems;
          const isBingo   = bingoCells.has(idx);
          return (
            <View key={idx} style={[styles.cell, isChecked && styles.cellChecked, isBingo && styles.cellBingo]}>
              <Text style={[styles.cellText, isChecked && styles.cellTextChecked]} numberOfLines={3}>{item}</Text>
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
  onCancel: () => void;
  styles: StylesType;
  colors: Colors;
}) {
  const [items, setItems] = useState<string[]>([...DEFAULT_BINGO_ITEMS]);
  const [saving, setSaving] = useState(false);

  const allFilled = items.every(t => t.trim().length > 0);

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
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      Alert.alert('오류', msg.includes('최대 3개') ? msg : '빙고판 시작에 실패했어요');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.flex}>
      <View style={styles.setupToolbar}>
        <Text style={styles.setupHint}>25개 항목을 채우세요 ({items.filter(t => t.trim()).length}/25)</Text>
        <TouchableOpacity testID="btn-fill-default" onPress={() => setItems([...DEFAULT_BINGO_ITEMS])} style={styles.fillBtn}>
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
        <TouchableOpacity testID="btn-cancel-setup" onPress={onCancel} style={styles.cancelSetupBtn}>
          <Text style={styles.cancelSetupText}>취소</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="btn-start-board"
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
  onComplete,
  styles,
}: {
  board: BingoBoard;
  myUid: string;
  onToggle: (index: number) => void;
  onComplete: () => void;
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
              style={[styles.cell, isChecked && styles.cellChecked, isBingo && styles.cellBingo]}
              onPress={() => onToggle(idx)}
              activeOpacity={0.7}
            >
              <Text style={[styles.cellText, isChecked && styles.cellTextChecked]} numberOfLines={3}>
                {item}
              </Text>
              {isChecked && <Text style={styles.cellCheck}>{checkedByMe ? '✓' : '✔'}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {board.status === 'completed' ? (
        <View style={styles.completedBanner}>
          <Text style={styles.completedText}>🏆 빙고판 완성! 새 판을 시작해보세요 (우상단 ↺)</Text>
        </View>
      ) : (
        <TouchableOpacity testID="btn-archive" style={styles.archiveBtn} onPress={onComplete}>
          <Text style={styles.archiveBtnText}>기록으로 넘기기</Text>
        </TouchableOpacity>
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

  // empty state
  emptyContainer:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[6], gap: space[4] },
  emptyTitle:        { ...typography.bodyBold, color: colors.text.primary },
  emptySub:          { ...typography.caption, color: colors.text.muted, textAlign: 'center' },
  emptyNewBtn:       { paddingHorizontal: space[6], paddingVertical: space[4], backgroundColor: colors.accent.primary, borderRadius: radius.lg },
  emptyNewBtnText:   { ...typography.bodyBold, color: colors.text.inverse },
  emptyHistBtn:      { paddingVertical: space[2] },

  // tabs
  tabBar:            { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  tab:               { flex: 1, alignItems: 'center', paddingVertical: space[3], borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabLabel:          { ...typography.caption, color: colors.text.secondary, fontFamily: 'Pretendard-SemiBold' },
  tabProgress:       { ...typography.tiny, color: colors.text.muted, marginTop: 2 },

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
  cellText:          { ...typography.tiny, color: colors.text.secondary, textAlign: 'center', lineHeight: 14 },
  cellTextChecked:   { color: colors.text.inverse, fontFamily: 'Pretendard-SemiBold' },
  cellCheck:         { position: 'absolute', top: 2, right: 4, fontSize: 10, color: 'rgba(255,255,255,0.8)' },

  completedBanner:   { backgroundColor: colors.accent.warm + '25', borderRadius: radius.lg, padding: space[4] },
  completedText:     { ...typography.body, color: colors.accent.warm, textAlign: 'center' },

  archiveBtn:        { alignItems: 'center', paddingVertical: space[3], borderWidth: 1, borderColor: colors.border.subtle, borderRadius: radius.lg },
  archiveBtnText:    { ...typography.caption, color: colors.text.muted },
});
