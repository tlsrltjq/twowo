import {
  collection,
  doc,
  DocumentData,
  getDocs,
  limit,
  onSnapshot,
  query,
  QueryDocumentSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { db } from '../../core/config/firebase';
import { checkLines } from './checkLines';
import type { BingoBoard } from './types';

export type { BingoBoard };
export { checkLines, getBingoCells, LINES } from './checkLines';
export { DEFAULT_BINGO_ITEMS } from './defaultItems';

// ─── helpers ──────────────────────────────────────────────────────────────────

function mapBoard(d: QueryDocumentSnapshot<DocumentData>): BingoBoard {
  const data = d.data();
  return {
    id: d.id,
    coupleId: data['coupleId'],
    boardType: data['boardType'] ?? 'couple', // 레거시 보드는 couple로 취급
    ownerUid: data['ownerUid'] ?? null,
    status: data['status'],
    items: data['items'] ?? [],
    checkedItems: data['checkedItems'] ?? {},
    checkedBy: Object.fromEntries(
      Object.entries(data['checkedBy'] ?? {}).map(([k, v]) => {
        const entry = v as { uid: string; at?: { toDate(): Date } | null };
        return [k, { uid: entry.uid, at: entry.at?.toDate() ?? null }];
      }),
    ),
    completedLines: data['completedLines'] ?? [],
    startedAt: data['startedAt']?.toDate() ?? null,
    completedAt: data['completedAt']?.toDate() ?? null,
  };
}

// ─── subscriptions ────────────────────────────────────────────────────────────

// 공유 빙고 활성 보드 구독 (boardType='couple', 최대 3개)
// 클라이언트 필터로 레거시 보드(boardType 없는) 포함
export function subscribeActiveBoards(
  coupleId: string,
  cb: (boards: BingoBoard[]) => void,
): () => void {
  const q = query(
    collection(db, 'bingoBoards'),
    where('coupleId', '==', coupleId),
    where('status', '==', 'active'),
    limit(10),
  );
  return onSnapshot(
    q,
    snap => {
      const boards = snap.docs.map(mapBoard)
        .filter(b => b.boardType === 'couple')
        .sort((a, b) => (a.startedAt?.getTime() ?? 0) - (b.startedAt?.getTime() ?? 0))
        .slice(0, 3);
      cb(boards);
    },
    () => cb([]),
  );
}

// 개인 빙고 활성 보드 구독 (boardType='personal', 커플 양쪽 보드 반환)
export function subscribePersonalBoards(
  coupleId: string,
  cb: (boards: BingoBoard[]) => void,
): () => void {
  const q = query(
    collection(db, 'bingoBoards'),
    where('coupleId', '==', coupleId),
    where('status', '==', 'active'),
    where('boardType', '==', 'personal'),
    limit(6),
  );
  return onSnapshot(
    q,
    snap => {
      const boards = snap.docs.map(mapBoard)
        .sort((a, b) => (a.startedAt?.getTime() ?? 0) - (b.startedAt?.getTime() ?? 0));
      cb(boards);
    },
    () => cb([]),
  );
}

// 단일 구독 — 하위 호환 (기존 코드에서 사용 중인 경우 대비)
export function subscribeActiveBoard(
  coupleId: string,
  cb: (board: BingoBoard | null) => void,
): () => void {
  return subscribeActiveBoards(coupleId, boards => cb(boards[0] ?? null));
}

// ─── mutations ────────────────────────────────────────────────────────────────

// BR-1/P3: 동시 최대 3개(타입별). 초과 시 에러. BR-3: 빈 항목 불가.
export async function startBoard(
  coupleId: string,
  items: string[],
  options: { boardType?: 'couple' | 'personal'; ownerUid?: string } = {},
): Promise<string> {
  if (items.length !== 25) throw new Error('items must be exactly 25');
  if (items.some(t => !t.trim())) throw new Error('items cannot be empty (BR-3)');
  if (items.some(t => t.trim().length > 50)) throw new Error('items cannot exceed 50 chars (BR-8)');

  const boardType = options.boardType ?? 'couple';
  const ownerUid  = options.ownerUid  ?? null;

  // 동시 활성 상한 체크 (클라이언트 필터로 타입 분리)
  const activeSnap = await getDocs(query(
    collection(db, 'bingoBoards'),
    where('coupleId', '==', coupleId),
    where('status', '==', 'active'),
    limit(10),
  ));
  const activeOfType = activeSnap.docs
    .map(d => ({ boardType: d.data()['boardType'] ?? 'couple', ownerUid: d.data()['ownerUid'] ?? null }))
    .filter(d => {
      if (boardType === 'personal') return d.boardType === 'personal' && d.ownerUid === ownerUid;
      return d.boardType === 'couple';
    });
  const maxActive = boardType === 'personal' ? 1 : 3; // BR-P3: 개인 빙고는 동시 1개
  if (activeOfType.length >= maxActive) {
    throw new Error(boardType === 'personal'
      ? '개인 빙고는 한 번에 1개만 진행할 수 있어요 (BR-P3)'
      : '최대 3개까지 동시에 진행할 수 있어요 (BR-1)');
  }

  const batch = writeBatch(db);
  const newRef = doc(collection(db, 'bingoBoards'));
  batch.set(newRef, {
    coupleId,
    boardType,
    ownerUid,
    status: 'active',
    items,
    checkedItems: {},
    checkedBy: {},
    completedLines: [],
    startedAt: serverTimestamp(),
  });
  await batch.commit();
  return newRef.id;
}

// 강제 완료 처리 — 다 못 끝내도 기록으로 넘기기
export async function completeBoard(boardId: string): Promise<void> {
  await updateDoc(doc(db, 'bingoBoards', boardId), {
    status: 'completed',
    completedAt: serverTimestamp(),
  });
}

// ─── history ──────────────────────────────────────────────────────────────────

// 공유 빙고 이전 기록
export async function getBoardHistory(coupleId: string, limitCount = 20): Promise<BingoBoard[]> {
  const q = query(
    collection(db, 'bingoBoards'),
    where('coupleId', '==', coupleId),
    where('status', '==', 'completed'),
    limit(limitCount + 10), // 개인 보드 섞일 수 있어 여분 fetch
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(mapBoard)
    .filter(b => b.boardType === 'couple')
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))
    .slice(0, limitCount);
}

// 개인 빙고 이전 기록 (본인 보드만)
export async function getPersonalBoardHistory(
  coupleId: string,
  ownerUid: string,
  limitCount = 20,
): Promise<BingoBoard[]> {
  const q = query(
    collection(db, 'bingoBoards'),
    where('coupleId', '==', coupleId),
    where('status', '==', 'completed'),
    where('boardType', '==', 'personal'),
    limit(limitCount),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(mapBoard)
    .filter(b => b.ownerUid === ownerUid)
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0));
}

// ─── BR-4/P2: 체크/해제 트랜잭션. BR-5: 라인 재계산. BR-6: 25칸 완성 → completed. ────

export async function toggleCell(
  boardId: string,
  uid: string,
  index: number,
): Promise<{ newLines: number[] }> {
  const ref = doc(db, 'bingoBoards', boardId);
  let newLines: number[] = [];

  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('board not found');
    const data = snap.data();

    // BR-P2: 개인 보드는 소유자만 체크 가능
    if ((data['boardType'] ?? 'couple') === 'personal' && data['ownerUid'] !== uid) {
      throw new Error('개인 빙고는 본인만 체크할 수 있어요 (BR-P2)');
    }
    const key = String(index);

    const newChecked: Record<string, true> = { ...data.checkedItems };
    const newBy: Record<string, { uid: string; at: unknown }> = { ...data['checkedBy'] as Record<string, { uid: string; at: unknown }> };

    if (key in newChecked) {
      delete newChecked[key];
      delete newBy[key];
    } else {
      newChecked[key] = true;
      newBy[key] = { uid, at: serverTimestamp() };
    }

    const lines = checkLines(newChecked);
    const prevLines: number[] = data.completedLines ?? [];
    newLines = lines.filter(l => !prevLines.includes(l));
    const allDone = Object.keys(newChecked).length === 25;

    tx.update(ref, {
      checkedItems: newChecked,
      checkedBy: newBy,
      completedLines: lines,
      ...(allDone ? { status: 'completed', completedAt: serverTimestamp() } : {}),
    });
  });

  return { newLines };
}
