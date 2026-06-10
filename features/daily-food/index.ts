import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';

import { db } from '../../core/config/firebase';
import { getTodayKST } from '../../core/utils/date';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export const MEAL_LABEL: Record<MealType, string> = {
  breakfast: '아침',
  lunch:     '점심',
  dinner:    '저녁',
  snack:     '간식',
};

export const MEAL_EMOJI: Record<MealType, string> = {
  breakfast: '🍳',
  lunch:     '🍱',
  dinner:    '🍽️',
  snack:     '🍪',
};

export interface FoodLog {
  id: string;
  coupleId: string;
  userId: string;
  date: string;
  mealType: MealType;
  name: string;
  loggedAt: Date;
}

function fromFirestore(id: string, data: Record<string, any>): FoodLog {
  return {
    id,
    coupleId: data.coupleId,
    userId:   data.userId,
    date:     data.date,
    mealType: data.mealType,
    name:     data.name,
    loggedAt: data.loggedAt?.toDate() ?? new Date(),
  };
}

// 현재 시간에 따라 기본 mealType 추천
export function suggestMealType(): MealType {
  const h = new Date().getHours();
  if (h >= 6  && h < 10) return 'breakfast';
  if (h >= 11 && h < 15) return 'lunch';
  if (h >= 17 && h < 21) return 'dinner';
  return 'snack';
}

// BR-DF1: 1~50자, 공백 금지
// BR-DF2: 유효 mealType 검증
export async function logFood(
  coupleId: string,
  userId: string,
  mealType: MealType,
  name: string,
): Promise<void> {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 50) {
    throw new Error('메뉴 이름은 1~50자여야 합니다');
  }
  if (!MEAL_TYPES.includes(mealType)) {
    throw new Error('유효하지 않은 식사 타입입니다');
  }
  const date = getTodayKST();
  await addDoc(collection(db, 'foodLogs'), {
    coupleId,
    userId,
    date,
    mealType,
    name: trimmed,
    loggedAt: serverTimestamp(),
  });
}

// BR-DF5: 삭제 (내 기록만 — 보안 규칙에서 userId 검증)
export async function deleteFood(id: string): Promise<void> {
  await deleteDoc(doc(db, 'foodLogs', id));
}

// BR-DF3: 오늘 날짜만 — where date == today
// BR-DF4: 실시간 구독
export function subscribeTodayFood(
  coupleId: string,
  cb: (logs: FoodLog[]) => void,
): () => void {
  const today = getTodayKST();
  const q = query(
    collection(db, 'foodLogs'),
    where('coupleId', '==', coupleId),
    where('date', '==', today),
    orderBy('loggedAt', 'asc'),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map(d => fromFirestore(d.id, d.data() as Record<string, any>)));
  });
}
