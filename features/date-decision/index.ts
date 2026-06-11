import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';

import { db } from '../../core/config/firebase';
import type { DateCandidate, VoteCategory, VoteSession } from './types';

export type { DateCandidate, VoteCategory,VoteSession };
export { CATEGORY_LABELS } from './types';

// ─── helpers ──────────────────────────────────────────────────────────────────

function mapCandidate(d: QueryDocumentSnapshot): DateCandidate {
  const data = d.data();
  return {
    id: d.id,
    coupleId: data['coupleId'],
    title: data['title'],
    category: data['category'] ?? 'etc',
    createdBy: data['createdBy'],
    createdAt: data['createdAt']?.toDate() ?? new Date(),
  };
}

function mapSession(d: QueryDocumentSnapshot): VoteSession {
  const data = d.data();
  return {
    id: d.id,
    coupleId: data['coupleId'],
    status: data['status'],
    choices: data['choices'] ?? {},
    startedAt: data['startedAt']?.toDate() ?? null,
    revealedAt: data['revealedAt']?.toDate() ?? null,
  };
}

// ─── candidates ───────────────────────────────────────────────────────────────

export function subscribeCandidates(
  coupleId: string,
  cb: (list: DateCandidate[]) => void,
): () => void {
  const q = query(
    collection(db, 'dateCandidates'),
    where('coupleId', '==', coupleId),
    orderBy('createdAt', 'asc'),
  );
  return onSnapshot(q, snap => cb(snap.docs.map(mapCandidate)));
}

export async function addCandidate(
  coupleId: string,
  uid: string,
  title: string,
  category: VoteCategory,
): Promise<void> {
  await addDoc(collection(db, 'dateCandidates'), {
    coupleId,
    title: title.trim(),
    category,
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
}

export async function removeCandidate(candidateId: string): Promise<void> {
  await deleteDoc(doc(db, 'dateCandidates', candidateId));
}

// ─── sessions ─────────────────────────────────────────────────────────────────

export function subscribeLatestSession(
  coupleId: string,
  cb: (inProgress: VoteSession | null, lastRevealed: VoteSession | null) => void,
): () => void {
  let inProg: VoteSession | null = null;
  let lastRev: VoteSession | null = null;

  const q1 = query(
    collection(db, 'voteSessions'),
    where('coupleId', '==', coupleId),
    where('status', '==', 'in_progress'),
    orderBy('startedAt', 'desc'),
    limit(1),
  );
  const q2 = query(
    collection(db, 'voteSessions'),
    where('coupleId', '==', coupleId),
    where('status', '==', 'revealed'),
    orderBy('startedAt', 'desc'),
    limit(1),
  );

  const u1 = onSnapshot(
    q1,
    snap => { inProg = snap.empty ? null : mapSession(snap.docs[0]!); cb(inProg, lastRev); },
    () =>   { inProg = null; cb(inProg, lastRev); },
  );
  const u2 = onSnapshot(
    q2,
    snap => { lastRev = snap.empty ? null : mapSession(snap.docs[0]!); cb(inProg, lastRev); },
    () =>   { lastRev = null; cb(inProg, lastRev); },
  );

  return () => { u1(); u2(); };
}

export async function startNewRound(coupleId: string): Promise<string> {
  const ref = await addDoc(collection(db, 'voteSessions'), {
    coupleId,
    status: 'in_progress',
    choices: {},
    startedAt: serverTimestamp(),
  });
  return ref.id;
}

// BR-5: 양쪽 choices 채워지면 트랜잭션 내에서 status = 'revealed' 전이
export async function castVote(
  sessionId: string,
  uid: string,
  candidateId: string,
  memberIds: string[],
): Promise<void> {
  const sessionRef = doc(db, 'voteSessions', sessionId);
  await runTransaction(db, async tx => {
    const snap = await tx.get(sessionRef);
    if (!snap.exists()) throw new Error('session not found');
    const choices = { ...snap.data().choices, [uid]: candidateId };
    const bothVoted = memberIds.every(id => id in choices);
    tx.update(sessionRef, {
      choices,
      ...(bothVoted ? { status: 'revealed', revealedAt: serverTimestamp() } : {}),
    });
  });
}
