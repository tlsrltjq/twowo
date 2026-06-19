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
  getPersonalBoardHistory,
  startBoard,
  subscribeActiveBoards,
  subscribePersonalBoards,
  toggleCell,
} from './index';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_PAD  = space[4];
const CELL_GAP  = 4;
const CELL_SIZE = Math.floor((SCREEN_W - GRID_PAD * 2 - CELL_GAP * 4) / 5);

type ScreenMode = 'game' | 'setup' | 'history' | 'history-detail';
type BingoMode  = 'couple' | 'personal';

// ─── main screen ──────────────────────────────────────────────────────────────

export default function BingoScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user, coupleId } = useAuthStore();

  // ── top-level mode ──────────────────────────────────────────────────────────
  const [bingoMode, setBingoMode] = useState<BingoMode>('couple');
  const [mode, setMode]           = useState<ScreenMode>('game');

  // ── couple boards ───────────────────────────────────────────────────────────
  const [coupleBoards, setCoupleBoards]   = useState<BingoBoard[] | 'loading'>('loading');
  const [coupleActiveIdx, setCoupleActiveIdx] = useState(0);
  const couplePrevLinesRef = useRef<Record<string, number[]>>({});

  // ── personal boards ─────────────────────────────────────────────────────────
  const [personalBoards, setPersonalBoards] = useState<BingoBoard[] | 'loading'>('loading');
  const [personalView, setPersonalView]     = useState<'mine' | 'partner'>('mine');
  const [myBoardIdx, setMyBoardIdx]         = useState(0);
  const [partnerBoardIdx, setPartnerBoardIdx] = useState(0);
  const personalPrevLinesRef = useRef<Record<string, number[]>>({});

  // ── history (shared) ────────────────────────────────────────────────────────
  const [historyBoards, setHistoryBoards]   = useState<BingoBoard[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedBoard, setSelectedBoard]   = useState<BingoBoard | null>(null);
  const [setupFromHistory, setSetupFromHistory] = useState(false);

  // ── couple subscription ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!coupleId) return;
    return subscribeActiveBoards(coupleId, incoming => {
      setCoupleBoards(prev => {
        const prevArr = prev === 'loading' ? [] : prev;
        incoming.forEach(b => {
          const prev = couplePrevLinesRef.current[b.id] ?? [];
          const newLines = b.completedLines.filter(l => !prev.includes(l));
          if (newLines.length > 0 && prevArr.length > 0) {
            Alert.alert('🎉 빙고!', `빙고 ${newLines.length}줄을 완성했어요!`);
          }
          const prevBoard = prevArr.find(pb => pb.id === b.id);
          if (b.status === 'completed' && prevBoard?.status !== 'completed') {
            Alert.alert('🏆 완성!', '빙고판을 모두 채웠어요!');
          }
          couplePrevLinesRef.current[b.id] = b.completedLines;
        });
        return incoming;
      });
      setCoupleActiveIdx(prev => (incoming.length === 0 ? 0 : Math.min(prev, incoming.length - 1)));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId]);

  // ── personal subscription ───────────────────────────────────────────────────
  useEffect(() => {
    if (!coupleId) return;
    return subscribePersonalBoards(coupleId, incoming => {
      setPersonalBoards(prev => {
        const prevArr = prev === 'loading' ? [] : prev;
        incoming.filter(b => b.ownerUid === user?.uid).forEach(b => {
          const prev = personalPrevLinesRef.current[b.id] ?? [];
          const newLines = b.completedLines.filter(l => !prev.includes(l));
          if (newLines.length > 0 && prevArr.length > 0) {
            Alert.alert('🎉 빙고!', `내 개인 빙고 ${newLines.length}줄 완성!`);
          }
          personalPrevLinesRef.current[b.id] = b.completedLines;
        });
        return incoming;
      });
      setMyBoardIdx(prev => {
        const myCount = incoming.filter(b => b.ownerUid === user?.uid).length;
        return myCount === 0 ? 0 : Math.min(prev, myCount - 1);
      });
      setPartnerBoardIdx(prev => {
        const partnerCount = incoming.filter(b => b.ownerUid !== user?.uid).length;
        return partnerCount === 0 ? 0 : Math.min(prev, partnerCount - 1);
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId, user?.uid]);

  // ── derived ─────────────────────────────────────────────────────────────────
  const activeCouple  = coupleBoards === 'loading' ? [] : coupleBoards;
  const activePersonal = personalBoards === 'loading' ? [] : personalBoards;
  const myBoards      = activePersonal.filter(b => b.ownerUid === user?.uid);
  const partnerBoards = activePersonal.filter(b => b.ownerUid !== user?.uid);

  const coupleBoard  = activeCouple[coupleActiveIdx] ?? null;
  const myBoard      = myBoards[myBoardIdx] ?? null;
  const partnerBoard = partnerBoards[partnerBoardIdx] ?? null;

  // ── history load ────────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    if (!coupleId) return;
    setHistoryLoading(true);
    try {
      const list = bingoMode === 'personal' && user?.uid
        ? await getPersonalBoardHistory(coupleId, user.uid)
        : await getBoardHistory(coupleId);
      setHistoryBoards(list);
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  }, [coupleId, bingoMode, user?.uid]);

  useEffect(() => {
    if (mode === 'history') loadHistory();
  }, [mode, loadHistory]);

  // ── handlers ────────────────────────────────────────────────────────────────
  const handleToggle = useCallback(async (index: number) => {
    const board = bingoMode === 'couple' ? coupleBoard : myBoard;
    if (!board || !user) return;
    try {
      await toggleCell(board.id, user.uid, index);
    } catch {
      Alert.alert('오류', '다시 시도해주세요');
    }
  }, [bingoMode, coupleBoard, myBoard, user]);

  const handleStartSetup = (fromHistory = false) => {
    setSetupFromHistory(fromHistory);
    setMode('setup');
  };

  const handleCancelSetup = () => {
    setMode(setupFromHistory ? 'history' : 'game');
  };

  const makeHandleComplete = (board: BingoBoard | null) => () => {
    if (!board) return;
    Alert.alert(
      '기록으로 넘기기',
      '미완성 항목이 있어도 지금까지의 기록을 저장하고 완료 처리합니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '확인',
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

  const handleSwitchBingoMode = (next: BingoMode) => {
    setBingoMode(next);
    setMode('game');
    setHistoryBoards([]);
    setSelectedBoard(null);
  };

  // ── loading guard ───────────────────────────────────────────────────────────
  if (coupleBoards === 'loading' || personalBoards === 'loading') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header onBack={() => router.back()} styles={styles} colors={colors} />
        <View style={styles.center}><Spinner /></View>
      </SafeAreaView>
    );
  }

  // ── header config ───────────────────────────────────────────────────────────
  const headerTitle = mode === 'history'        ? '이전 기록'
    : mode === 'history-detail'                 ? '완료된 빙고판'
    : mode === 'setup'                          ? (bingoMode === 'personal' ? '개인 빙고판 만들기' : '함께 빙고판 만들기')
    : bingoMode === 'personal'                  ? '개인 빙고 ⚔️'
    : '데이트 빙고 🎯';

  const headerOnBack = mode === 'history-detail' ? () => setMode('history')
    : mode === 'history' || mode === 'setup'     ? () => setMode('game')
    : () => router.back();

  const headerOnHistory = (mode !== 'history' && mode !== 'history-detail' && mode !== 'setup')
    ? () => setMode('history') : undefined;

  const canAddBoard = bingoMode === 'couple'
    ? activeCouple.length < 3
    : myBoards.length < 3;

  const headerOnNewBoard = (mode !== 'setup' && canAddBoard && mode !== 'history' && mode !== 'history-detail')
    ? () => handleStartSetup(false) : undefined;

  // ── render ──────────────────────────────────────────────────────────────────
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

      {/* 모드 토글: 함께 / 개인 — game·setup 화면에서만 표시 */}
      {(mode === 'game' || mode === 'setup') && (
        <BingoModeToggle
          value={bingoMode}
          onChange={handleSwitchBingoMode}
          styles={styles}
          colors={colors}
        />
      )}

      {/* ── 공통: 이전 기록 / 상세 ── */}
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

      // ── 설정 화면 ──
      ) : mode === 'setup' ? (
        <SetupView
          coupleId={coupleId!}
          boardType={bingoMode}
          ownerUid={bingoMode === 'personal' ? (user?.uid ?? '') : null}
          onStarted={() => {
            if (bingoMode === 'couple') {
              setCoupleActiveIdx(activeCouple.length);
            } else {
              setMyBoardIdx(myBoards.length);
            }
            setMode('game');
          }}
          onCancel={handleCancelSetup}
          styles={styles}
          colors={colors}
        />

      // ── 함께 빙고 게임 ──
      ) : bingoMode === 'couple' ? (
        activeCouple.length === 0 ? (
          <EmptyState
            onNew={() => handleStartSetup()}
            onHistory={() => setMode('history')}
            styles={styles}
            colors={colors}
          />
        ) : (
          <View style={styles.flex}>
            {activeCouple.length > 1 && (
              <BoardTabs
                boards={activeCouple}
                activeIdx={coupleActiveIdx}
                onSelect={setCoupleActiveIdx}
                styles={styles}
                colors={colors}
              />
            )}
            <GameView
              board={coupleBoard!}
              myUid={user?.uid ?? ''}
              onToggle={handleToggle}
              styles={styles}
            />
            {coupleBoard?.status !== 'completed' && (
              <TouchableOpacity
                testID="btn-archive"
                style={styles.archiveFooter}
                onPress={makeHandleComplete(coupleBoard)}
              >
                <Text style={styles.archiveBtnText}>기록으로 넘기기</Text>
              </TouchableOpacity>
            )}
          </View>
        )

      // ── 개인 빙고 게임 ──
      ) : (
        <PersonalBingoView
          myBoards={myBoards}
          partnerBoards={partnerBoards}
          myBoardIdx={myBoardIdx}
          partnerBoardIdx={partnerBoardIdx}
          myBoard={myBoard}
          partnerBoard={partnerBoard}
          personalView={personalView}
          myUid={user?.uid ?? ''}
          onSelectMyIdx={setMyBoardIdx}
          onSelectPartnerIdx={setPartnerBoardIdx}
          onSetPersonalView={setPersonalView}
          onToggle={handleToggle}
          onComplete={makeHandleComplete(myBoard)}
          onNew={() => handleStartSetup()}
          onHistory={() => setMode('history')}
          styles={styles}
          colors={colors}
        />
      )}
    </SafeAreaView>
  );
}

// ─── bingo mode toggle ────────────────────────────────────────────────────────

function BingoModeToggle({
  value,
  onChange,
  styles,
  colors,
}: {
  value: BingoMode;
  onChange: (m: BingoMode) => void;
  styles: StylesType;
  colors: Colors;
}) {
  return (
    <View style={styles.modeToggleRow}>
      <TouchableOpacity
        testID="btn-mode-couple"
        style={[styles.modeBtn, value === 'couple' && { backgroundColor: colors.accent.primary }]}
        onPress={() => onChange('couple')}
      >
        <Text style={[styles.modeBtnText, value === 'couple' && { color: colors.text.inverse }]}>
          🤝 함께
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-mode-personal"
        style={[styles.modeBtn, value === 'personal' && { backgroundColor: colors.accent.warm }]}
        onPress={() => onChange('personal')}
      >
        <Text style={[styles.modeBtnText, value === 'personal' && { color: colors.text.inverse }]}>
          ⚔️ 개인
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── personal bingo view ──────────────────────────────────────────────────────

function PersonalBingoView({
  myBoards,
  partnerBoards,
  myBoardIdx,
  partnerBoardIdx,
  myBoard,
  partnerBoard,
  personalView,
  myUid,
  onSelectMyIdx,
  onSelectPartnerIdx,
  onSetPersonalView,
  onToggle,
  onComplete,
  onNew,
  onHistory,
  styles,
  colors,
}: {
  myBoards: BingoBoard[];
  partnerBoards: BingoBoard[];
  myBoardIdx: number;
  partnerBoardIdx: number;
  myBoard: BingoBoard | null;
  partnerBoard: BingoBoard | null;
  personalView: 'mine' | 'partner';
  myUid: string;
  onSelectMyIdx: (i: number) => void;
  onSelectPartnerIdx: (i: number) => void;
  onSetPersonalView: (v: 'mine' | 'partner') => void;
  onToggle: (i: number) => void;
  onComplete: () => void;
  onNew: () => void;
  onHistory: () => void;
  styles: StylesType;
  colors: Colors;
}) {
  if (myBoards.length === 0 && partnerBoards.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>개인 빙고판이 없어요</Text>
        <Text style={styles.emptySub}>각자 자신만의 빙고판을 만들고{'\n'}먼저 빙고를 달성해보세요!</Text>
        <TouchableOpacity testID="btn-empty-new" style={styles.emptyNewBtn} onPress={onNew}>
          <Text style={styles.emptyNewBtnText}>내 빙고판 만들기</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="btn-empty-history" onPress={onHistory} style={styles.emptyHistBtn}>
          <Text style={[styles.emptySub, { color: colors.accent.primary }]}>이전 기록 보기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 점수 비교
  const myLines     = myBoards.reduce((acc, b) => acc + b.completedLines.length, 0);
  const partnerLines = partnerBoards.reduce((acc, b) => acc + b.completedLines.length, 0);

  const activeBoard = personalView === 'mine' ? myBoard : partnerBoard;
  const isMyTurn    = personalView === 'mine';

  return (
    <View style={styles.flex}>
      {/* 점수바 */}
      <View style={styles.scorebar}>
        <View style={styles.scoreItem}>
          <Text style={[styles.scoreNum, { color: colors.accent.primary }]}>{myLines}</Text>
          <Text style={styles.scoreLabel}>나 (빙고줄)</Text>
        </View>
        <Text style={styles.scoreVs}>VS</Text>
        <View style={styles.scoreItem}>
          <Text style={[styles.scoreNum, { color: colors.accent.warm }]}>{partnerLines}</Text>
          <Text style={styles.scoreLabel}>상대방 (빙고줄)</Text>
        </View>
      </View>

      {/* 나 / 상대방 탭 */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          testID="btn-personal-mine"
          style={[styles.tab, personalView === 'mine' && { borderBottomColor: colors.accent.primary }]}
          onPress={() => onSetPersonalView('mine')}
        >
          <Text style={[styles.tabLabel, personalView === 'mine' && { color: colors.accent.primary, fontFamily: 'Pretendard-SemiBold' }]}>
            나
          </Text>
          <Text style={[styles.tabProgress, personalView === 'mine' && { color: colors.accent.primary }]}>
            {myBoards.length > 0 ? `${Object.keys(myBoard?.checkedItems ?? {}).length}/25` : '-'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="btn-personal-partner"
          style={[styles.tab, personalView === 'partner' && { borderBottomColor: colors.accent.warm }]}
          onPress={() => onSetPersonalView('partner')}
        >
          <Text style={[styles.tabLabel, personalView === 'partner' && { color: colors.accent.warm, fontFamily: 'Pretendard-SemiBold' }]}>
            상대방
          </Text>
          <Text style={[styles.tabProgress, personalView === 'partner' && { color: colors.accent.warm }]}>
            {partnerBoards.length > 0 ? `${Object.keys(partnerBoard?.checkedItems ?? {}).length}/25` : '-'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 하위 보드 탭 (여러 개일 때) */}
      {isMyTurn && myBoards.length > 1 && (
        <BoardTabs
          boards={myBoards}
          activeIdx={myBoardIdx}
          onSelect={onSelectMyIdx}
          styles={styles}
          colors={colors}
        />
      )}
      {!isMyTurn && partnerBoards.length > 1 && (
        <BoardTabs
          boards={partnerBoards}
          activeIdx={partnerBoardIdx}
          onSelect={onSelectPartnerIdx}
          styles={styles}
          colors={colors}
        />
      )}

      {/* 보드 없음 */}
      {isMyTurn && !myBoard && (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>내 빙고판이 없어요</Text>
          <TouchableOpacity testID="btn-empty-new" style={styles.emptyNewBtn} onPress={onNew}>
            <Text style={styles.emptyNewBtnText}>내 빙고판 만들기</Text>
          </TouchableOpacity>
        </View>
      )}
      {!isMyTurn && !partnerBoard && (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>상대방이 아직 빙고판을 만들지 않았어요</Text>
          <Text style={styles.emptySub}>상대방이 시작하면 여기에 표시됩니다</Text>
        </View>
      )}

      {/* 게임 뷰 */}
      {activeBoard && (
        <GameView
          board={activeBoard}
          myUid={myUid}
          onToggle={isMyTurn ? onToggle : () => {}}
          readOnly={!isMyTurn}
          styles={styles}
        />
      )}

      {/* 기록으로 넘기기 — 내 보드에만 */}
      {isMyTurn && myBoard?.status !== 'completed' && (
        <TouchableOpacity
          testID="btn-archive"
          style={styles.archiveFooter}
          onPress={onComplete}
        >
          <Text style={styles.archiveBtnText}>기록으로 넘기기</Text>
        </TouchableOpacity>
      )}
      {!isMyTurn && (
        <View style={styles.readonlyFooter}>
          <Text style={styles.readonlyText}>상대방 보드 — 읽기 전용</Text>
        </View>
      )}
    </View>
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
      <TouchableOpacity testID="btn-bingo-back" onPress={onBack} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="뒤로 가기">
        <ChevronLeft size={24} color={colors.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerRight}>
        {onHistory && (
          <TouchableOpacity testID="btn-history" onPress={onHistory} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="이전 기록">
            <Clock size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        )}
        {onNewBoard && (
          <TouchableOpacity testID="btn-new-board" onPress={onNewBoard} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="새 빙고 시작">
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
          <TouchableOpacity testID={`btn-history-card-${index}`} style={styles.historyCard} onPress={() => onSelectBoard(b)} activeOpacity={0.7}>
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
        <Text testID="text-detail-header" style={styles.progressText}>{board.completedAt ? formatDate(board.completedAt) : '-'} 완료</Text>
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
  boardType,
  ownerUid,
  onStarted,
  onCancel,
  styles,
  colors,
}: {
  coupleId: string;
  boardType: 'couple' | 'personal';
  ownerUid: string | null;
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
      await startBoard(coupleId, items.map(t => t.trim()), {
        boardType,
        ...(ownerUid !== null ? { ownerUid } : {}),
      });
      onStarted();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      Alert.alert('오류', (msg.includes('최대 3개') || msg.includes('BR-P3')) ? msg : '빙고판 시작에 실패했어요');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.flex}>
      <View style={styles.setupToolbar}>
        <Text style={styles.setupHint}>25개 항목을 채우세요 ({items.filter(t => t.trim()).length}/25)</Text>
        <View style={styles.setupToolbarBtns}>
          <TouchableOpacity testID="btn-fill-default" onPress={() => setItems([...DEFAULT_BINGO_ITEMS])} style={styles.fillBtn}>
            <Text style={styles.fillBtnText}>기본값</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="btn-clear-all" onPress={() => setItems(Array(25).fill(''))} style={[styles.fillBtn, { marginLeft: space[2] }]}>
            <Text style={[styles.fillBtnText, { color: colors.text.muted }]}>전체 비우기</Text>
          </TouchableOpacity>
        </View>
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
        ListFooterComponent={<GridPreview styles={styles} colors={colors} />}
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

// ─── grid number preview ──────────────────────────────────────────────────────

function GridPreview({ styles, colors }: { styles: StylesType; colors: Colors }) {
  return (
    <View style={styles.previewContainer}>
      <Text style={styles.previewTitle}>칸 번호 위치 미리보기</Text>
      <View style={styles.previewGrid}>
        {Array.from({ length: 25 }, (_, i) => (
          <View key={i} style={styles.previewCell}>
            <Text style={[styles.previewCellNum, { color: colors.accent.primary }]}>{i + 1}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── game view ────────────────────────────────────────────────────────────────

function GameView({
  board,
  myUid,
  onToggle,
  readOnly = false,
  styles,
}: {
  board: BingoBoard;
  myUid: string;
  onToggle: (index: number) => void;
  readOnly?: boolean;
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
              style={[styles.cell, isChecked && styles.cellChecked, isBingo && styles.cellBingo, readOnly && styles.cellReadonly]}
              onPress={() => !readOnly && onToggle(idx)}
              activeOpacity={readOnly ? 1 : 0.7}
            >
              <Text style={[styles.cellText, isChecked && styles.cellTextChecked]} numberOfLines={3}>
                {item}
              </Text>
              {isChecked && <Text style={styles.cellCheck}>{checkedByMe ? '✓' : '✔'}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {board.status === 'completed' && (
        <View style={styles.completedBanner}>
          <Text style={styles.completedText}>🏆 빙고판 완성!</Text>
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

  // mode toggle
  modeToggleRow:     { flexDirection: 'row', gap: space[2], paddingHorizontal: space[4], paddingVertical: space[3], borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  modeBtn:           { flex: 1, paddingVertical: space[3], alignItems: 'center', borderRadius: radius.lg, backgroundColor: colors.bg.subtle },
  modeBtnText:       { ...typography.caption, color: colors.text.secondary, fontFamily: 'Pretendard-SemiBold' },

  // scorebar
  scorebar:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: space[3], gap: space[6], backgroundColor: colors.bg.surface },
  scoreItem:         { alignItems: 'center', gap: 2 },
  scoreNum:          { ...typography.title2, fontFamily: 'Pretendard-SemiBold' },
  scoreLabel:        { ...typography.tiny, color: colors.text.muted },
  scoreVs:           { ...typography.bodyBold, color: colors.text.muted },

  // empty state
  emptyContainer:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[6], gap: space[4] },
  emptyTitle:        { ...typography.bodyBold, color: colors.text.primary, textAlign: 'center' },
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
  setupToolbarBtns:  { flexDirection: 'row', alignItems: 'center' },
  setupHint:         { ...typography.caption, color: colors.text.muted, flex: 1 },
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

  // grid number preview
  previewContainer:  { marginTop: space[6], marginBottom: space[4] },
  previewTitle:      { ...typography.caption, color: colors.text.muted, marginBottom: space[3], textAlign: 'center' },
  previewGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: CELL_GAP },
  previewCell:       { width: CELL_SIZE, height: CELL_SIZE * 0.6, backgroundColor: colors.bg.surface, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border.subtle },
  previewCellNum:    { ...typography.caption, fontFamily: 'Pretendard-SemiBold' },

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
  cellReadonly:      { opacity: 0.85 },
  cellText:          { ...typography.tiny, color: colors.text.secondary, textAlign: 'center', lineHeight: 14 },
  cellTextChecked:   { color: colors.text.inverse, fontFamily: 'Pretendard-SemiBold' },
  cellCheck:         { position: 'absolute', top: 2, right: 4, fontSize: 10, color: 'rgba(255,255,255,0.8)' },

  completedBanner:   { backgroundColor: colors.accent.warm + '25', borderRadius: radius.lg, padding: space[4] },
  completedText:     { ...typography.body, color: colors.accent.warm, textAlign: 'center' },

  archiveFooter:     { borderTopWidth: 1, borderTopColor: colors.border.subtle, alignItems: 'center', paddingVertical: space[4] },
  archiveBtnText:    { ...typography.caption, color: colors.text.muted },

  readonlyFooter:    { borderTopWidth: 1, borderTopColor: colors.border.subtle, alignItems: 'center', paddingVertical: space[3] },
  readonlyText:      { ...typography.tiny, color: colors.text.muted },
});
