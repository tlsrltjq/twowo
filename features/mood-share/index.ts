import {
  collection,
  doc,
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
import { MoodCheck, MoodCheckInput, MoodLockedError } from './schema';

function docId(coupleId: string, userId: string, date: string): string {
  return `${coupleId}_${userId}_${date}`;
}

function fromFirestore(id: string, data: Record<string, any>): MoodCheck {
  return {
    id,
    coupleId:  data.coupleId,
    userId:    data.userId,
    date:      data.date,
    energy:    data.energy,
    mood:      data.mood,
    canMeet:   data.canMeet,
    memo:      data.memo ?? undefined,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
  };
}

// BR-1: 오늘 KST 기준 문서 조회
export async function getTodayMood(coupleId: string, userId: string): Promise<MoodCheck | null> {
  const today = getTodayKST();
  const ref   = doc(db, 'moodChecks', docId(coupleId, userId, today));
  const snap  = await getDoc(ref);
  if (!snap.exists()) return null;
  return fromFirestore(snap.id, snap.data() as Record<string, any>);
}

// BR-2/3: 당일 1회 생성, 당일 중 수정 허용. 다른 날 수정 시도 → MoodLockedError
export async function setTodayMood(input: MoodCheckInput): Promise<MoodCheck> {
  const today = getTodayKST();
  const ref   = doc(db, 'moodChecks', docId(input.coupleId, input.userId, today));

  let result!: MoodCheck;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) {
      const existing = snap.data() as Record<string, any>;
      // BR-2: 다른 날짜 문서이면 잠금 (날짜가 오늘이 아닌 경우)
      if (existing.date !== today) {
        throw new MoodLockedError();
      }
    }
    // BR-3: 이 트랜잭션 자체가 오늘 날짜로만 생성하므로 백필 불가
    const now = serverTimestamp();
    tx.set(
      ref,
      {
        coupleId:  input.coupleId,
        userId:    input.userId,
        date:      today,
        energy:    input.energy,
        mood:      input.mood,
        canMeet:   input.canMeet,
        memo:      input.memo ?? null,
        createdAt: snap.exists() ? (snap.data() as any).createdAt : now,
        updatedAt: now,
      },
      { merge: false },
    );
    result = {
      id:        ref.id,
      coupleId:  input.coupleId,
      userId:    input.userId,
      date:      today,
      energy:    input.energy,
      mood:      input.mood,
      canMeet:   input.canMeet,
      memo:      input.memo ?? undefined,
      createdAt: snap.exists() ? ((snap.data() as any).createdAt?.toDate?.() ?? new Date()) : new Date(),
      updatedAt: new Date(),
    };
  });

  return result;
}

// BR-6: 상대방 오늘 컨디션 실시간 구독
export function subscribePartnerMoodToday(
  coupleId: string,
  partnerUid: string,
  cb: (m: MoodCheck | null) => void,
): () => void {
  const today = getTodayKST();
  const ref   = doc(db, 'moodChecks', docId(coupleId, partnerUid, today));
  return onSnapshot(ref, (snap) => {
    cb(snap.exists() ? fromFirestore(snap.id, snap.data() as Record<string, any>) : null);
  });
}

// 내 오늘 컨디션 실시간 구독 (홈 화면에서 즉시 반영용)
export function subscribeMyMoodToday(
  coupleId: string,
  userId: string,
  cb: (m: MoodCheck | null) => void,
): () => void {
  const today = getTodayKST();
  const ref   = doc(db, 'moodChecks', docId(coupleId, userId, today));
  return onSnapshot(ref, (snap) => {
    cb(snap.exists() ? fromFirestore(snap.id, snap.data() as Record<string, any>) : null);
  });
}

// BR-7: 최근 7일 컨디션 조회 (읽기 전용)
export async function getRecent7Days(coupleId: string, userId: string): Promise<MoodCheck[]> {
  const q = query(
    collection(db, 'moodChecks'),
    where('coupleId', '==', coupleId),
    where('userId', '==', userId),
    orderBy('date', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => fromFirestore(d.id, d.data() as Record<string, any>))
    .slice(0, 7);
}

export type { MoodCheck, MoodCheckInput } from './schema';
