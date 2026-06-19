import {
  collection,
  doc,
  DocumentData,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  runTransaction,
  serverTimestamp,
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

// ─── subscription ──────────────────────────────────────────────────────────────

export function subscribeActiveBoard(
  coupleId: string,
  cb: (board: BingoBoard | null) => void,
): () => void {
  const q = query(
    collection(db, 'bingoBoards'),
    where('coupleId', '==', coupleId),
    where('status', '==', 'active'),
    limit(1),
  );
  return onSnapshot(
    q,
    snap => cb(snap.empty ? null : mapBoard(snap.docs[0]!)),
    ()   => cb(null),
  );
}

// ─── mutations ────────────────────────────────────────────────────────────────

// BR-1: 이전 활성 보드 completed 처리 후 새 보드 생성
// BR-3: 25개 미만 or 빈 항목 있으면 에러
export async function startBoard(coupleId: string, items: string[]): Promise<string> {
  if (items.length !== 25) throw new Error('items must be exactly 25');
  if (items.some(t => !t.trim())) throw new Error('items cannot be empty (BR-3)');
  if (items.some(t => t.trim().length > 50)) throw new Error('items cannot exceed 50 chars (BR-8)');

  const activeQ = query(
    collection(db, 'bingoBoards'),
    where('coupleId', '==', coupleId),
    where('status', '==', 'active'),
    limit(1),
  );
  const activeSnap = await getDocs(activeQ);

  const batch = writeBatch(db);
  if (!activeSnap.empty) {
    batch.update(activeSnap.docs[0]!.ref, {
      status: 'completed',
      completedAt: serverTimestamp(),
    });
  }

  const newRef = doc(collection(db, 'bingoBoards'));
  batch.set(newRef, {
    coupleId,
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

// ─── history ──────────────────────────────────────────────────────────────────

export async function getBoardHistory(coupleId: string, limitCount = 20): Promise<BingoBoard[]> {
  const q = query(
    collection(db, 'bingoBoards'),
    where('coupleId', '==', coupleId),
    where('status', '==', 'completed'),
    orderBy('completedAt', 'desc'),
    limit(limitCount),
  );
  const snap = await getDocs(q);
  return snap.docs.map(mapBoard);
}

// BR-4: 체크/해제 트랜잭션. BR-5: 라인 재계산. BR-6: 25칸 완성 → completed.
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
