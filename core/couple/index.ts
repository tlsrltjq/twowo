import {
  collection,
  doc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';

import { db } from '../config/firebase';
import { generateCode } from './generateCode';
import { Couple, JoinError } from './types';

function newDocId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 20; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

// BR-1: 로그인 직후 users 문서가 반드시 존재해야 한다. 없으면 자동 생성.
// 기존 문서가 있으면 displayName만 갱신하고 coupleId는 건드리지 않는다.
export async function ensureUserDoc(uid: string, displayName: string): Promise<void> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { id: uid, displayName, coupleId: null });
  } else {
    await setDoc(ref, { displayName }, { merge: true });
  }
}

// BR-0: 코드 발급 전 coupleId 확보. 이미 있으면 그대로 반환.
export async function ensureCouple(uid: string): Promise<{ coupleId: string }> {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists() && userSnap.data()!.coupleId) {
    return { coupleId: userSnap.data()!.coupleId as string };
  }
  const coupleId = newDocId();
  const coupleRef = doc(db, 'couples', coupleId);
  const batch = writeBatch(db);
  batch.set(coupleRef, { id: coupleId, memberIds: [uid], createdAt: serverTimestamp(), status: 'active' });
  batch.update(userRef, { coupleId });
  await batch.commit();
  return { coupleId };
}

// BR-2, BR-3: 6자리 코드 발급. 기존 코드 무효화 후 재발급.
export async function createInvite(uid: string): Promise<{ code: string; expiresAt: Date; coupleId: string }> {
  const { coupleId } = await ensureCouple(uid);
  const invRef = collection(db, 'invitations');
  const prevSnap = await getDocs(query(invRef, where('createdBy', '==', uid)));
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);
  const batch = writeBatch(db);
  prevSnap.forEach(d => batch.delete(d.ref));
  batch.set(doc(invRef, code), {
    coupleId,
    createdBy: uid,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
  });
  await batch.commit();
  return { code, expiresAt, coupleId };
}

// BR-4~8: 코드 입력 후 커플 연결. 실패 시 JoinError.
export async function joinByCode(uid: string, code: string): Promise<{ coupleId: string }> {
  let resultCoupleId = '';
  await runTransaction(db, async (tx) => {
    const invDocRef = doc(db, 'invitations', code);
    const inv = await tx.get(invDocRef);
    if (!inv.exists()) throw new JoinError('not_found');

    const { coupleId, createdBy, expiresAt } = inv.data() as {
      coupleId: string;
      createdBy: string;
      expiresAt: { toMillis(): number };
    };
    if (expiresAt.toMillis() < Date.now()) throw new JoinError('expired');
    if (createdBy === uid) throw new JoinError('self');

    const userRef = doc(db, 'users', uid);
    const userSnap = await tx.get(userRef);
    if (userSnap.exists() && userSnap.data()!.coupleId) throw new JoinError('already_joined');

    const coupleRef = doc(db, 'couples', coupleId);
    const couple = await tx.get(coupleRef);
    const memberIds = couple.data()!.memberIds as string[];
    if (memberIds.length >= 2) throw new JoinError('couple_full');

    tx.update(coupleRef, { memberIds: [...memberIds, uid] });
    tx.update(userRef, { coupleId });
    tx.delete(invDocRef);
    resultCoupleId = coupleId;
  });
  return { coupleId: resultCoupleId };
}

export async function getUserCoupleId(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? ((snap.data()!.coupleId as string | null) ?? null) : null;
}

export function subscribeCouple(coupleId: string, cb: (couple: Couple) => void): () => void {
  return onSnapshot(doc(db, 'couples', coupleId), (snap) => {
    if (snap.exists()) cb({ id: snap.id, ...snap.data() } as Couple);
  });
}
