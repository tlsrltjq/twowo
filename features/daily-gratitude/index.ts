import {
  collection,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';

import { db } from '../../core/config/firebase';
import { getTodayKST } from '../../core/utils/date';
import { GratitudeEntry, GratitudeInput, GratitudeLockError } from './schema';

function docId(coupleId: string, userId: string, date: string): string {
  return `${coupleId}_${userId}_${date}`;
}

function fromFirestore(id: string, data: DocumentData): GratitudeEntry {
  return {
    id,
    coupleId:  data.coupleId,
    userId:    data.userId,
    date:      data.date,
    message:   data.message,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
  };
}

// BR-1: 오늘 KST 기준 문서 조회
export async function getTodayGratitude(coupleId: string, userId: string): Promise<GratitudeEntry | null> {
  const today = getTodayKST();
  const ref   = doc(db, 'gratitudeEntries', docId(coupleId, userId, today));
  const snap  = await getDoc(ref);
  if (!snap.exists()) return null;
  return fromFirestore(snap.id, snap.data() as DocumentData);
}

// BR-1/2: 당일 1회 생성, 당일 중 수정 허용. 다른 날 수정 시도 → GratitudeLockError
export async function setTodayGratitude(input: GratitudeInput): Promise<GratitudeEntry> {
  const today = getTodayKST();
  const ref   = doc(db, 'gratitudeEntries', docId(input.coupleId, input.userId, today));

  let result!: GratitudeEntry;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) {
      const existing = snap.data() as DocumentData;
      if (existing.date !== today) throw new GratitudeLockError();
    }
    const now = serverTimestamp();
    tx.set(ref, {
      coupleId:  input.coupleId,
      userId:    input.userId,
      date:      today,
      message:   input.message,
      createdAt: snap.exists() ? (snap.data()!).createdAt : now,
      updatedAt: now,
    }, { merge: false });
    result = {
      id:        ref.id,
      coupleId:  input.coupleId,
      userId:    input.userId,
      date:      today,
      message:   input.message,
      createdAt: snap.exists() ? ((snap.data()!).createdAt?.toDate?.() ?? new Date()) : new Date(),
      updatedAt: new Date(),
    };
  });

  return result;
}

// BR-4: 상대방 오늘 고마움 실시간 구독
export function subscribePartnerGratitudeToday(
  coupleId: string,
  partnerUid: string,
  cb: (entry: GratitudeEntry | null) => void,
): () => void {
  const today = getTodayKST();
  const ref   = doc(db, 'gratitudeEntries', docId(coupleId, partnerUid, today));
  return onSnapshot(
    ref,
    (snap) => { cb(snap.exists() ? fromFirestore(snap.id, snap.data() as DocumentData) : null); },
    () => { cb(null); },
  );
}

// BR-5: 최근 7일 고마움 조회
export async function getRecent7DaysGratitude(coupleId: string, userId: string): Promise<GratitudeEntry[]> {
  const q = query(
    collection(db, 'gratitudeEntries'),
    where('coupleId', '==', coupleId),
    where('userId', '==', userId),
    orderBy('date', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => fromFirestore(d.id, d.data() as DocumentData))
    .slice(0, 7);
}

export type { GratitudeEntry, GratitudeInput } from './schema';
