import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { db } from '../../core/config/firebase';
import { deletePhotoData, encodeJpeg, savePhotoData } from '../../core/photos';
import { getTodayKST } from '../../core/utils/date';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'extra';

// 4개 고정 슬롯 (순서: 아침·점심·간식·저녁)
export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

export const MEAL_LABEL: Record<MealType, string> = {
  breakfast: '아침',
  lunch:     '점심',
  dinner:    '저녁',
  snack:     '간식',
  extra:     '추가',
};


export interface FoodLog {
  id: string;
  coupleId: string;
  userId: string;
  date: string;
  mealType: MealType;
  name: string;
  photoUrl: string | null;
  loggedAt: Date;
}

function fromFirestore(id: string, data: DocumentData): FoodLog {
  return {
    id,
    coupleId: data.coupleId,
    userId:   data.userId,
    date:     data.date,
    mealType: data.mealType,
    name:     data.name ?? '',
    photoUrl: data.photoUrl ?? null,
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

// ─── photo upload helper ──────────────────────────────────────────────────────

// ADR-032: 긴 변 800px JPEG 를 photoData 에 저장하고 참조를 photoUrl 에 둔다
async function saveFoodPhoto(coupleId: string, userId: string, localUri: string): Promise<string> {
  const encoded = await encodeJpeg(localUri, { maxSide: 800, quality: 0.75 });
  return savePhotoData(coupleId, userId, encoded);
}

// ─── mutations ────────────────────────────────────────────────────────────────

// 고정 슬롯 사진 upsert (deterministic docId → 재촬영 시 덮어씀)
export async function setMealPhoto(
  coupleId: string,
  userId: string,
  mealType: MealType,
  localUri: string,
): Promise<void> {
  const date = getTodayKST();
  const id = `${coupleId}_${userId}_${date}_${mealType}`;
  const ref = doc(db, 'foodLogs', id);
  const prev = await getDoc(ref);
  const prevPhoto = prev.exists() ? (prev.data()?.photoUrl as string | null | undefined) : null;
  const photoUrl = await saveFoodPhoto(coupleId, userId, localUri);
  await setDoc(ref, {
    coupleId,
    userId,
    date,
    mealType,
    name:      MEAL_LABEL[mealType],
    photoUrl,
    loggedAt:  serverTimestamp(),
  });
  // 같은 끼니 칸을 다시 찍으면 이전 사진 데이터는 지운다
  await deletePhotoData(prevPhoto).catch(() => undefined);
}

// 추가 사진 (addDoc, 여러 개 허용)
export async function addExtraPhoto(
  coupleId: string,
  userId: string,
  localUri: string,
): Promise<void> {
  const date = getTodayKST();
  const photoUrl = await saveFoodPhoto(coupleId, userId, localUri);
  await addDoc(collection(db, 'foodLogs'), {
    coupleId,
    userId,
    date,
    mealType:  'extra' as MealType,
    name:      '추가',
    photoUrl,
    loggedAt:  serverTimestamp(),
  });
}

// BR-DF1: 1~50자, 공백 금지. BR-DF2: 유효 mealType 검증. (텍스트 기반 — 레거시 호환)
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
    photoUrl: null,
    loggedAt: serverTimestamp(),
  });
}

// BR-DF5: 삭제 (내 기록만 — 보안 규칙에서 userId 검증)
export async function deleteFood(id: string): Promise<void> {
  const ref = doc(db, 'foodLogs', id);
  const snap = await getDoc(ref);
  const photoUrl = snap.exists() ? (snap.data()?.photoUrl as string | null | undefined) : null;
  await deleteDoc(ref);
  await deletePhotoData(photoUrl).catch(() => undefined);
}

// ─── subscriptions / queries ──────────────────────────────────────────────────

// BR-DF3/4: 오늘 날짜 실시간 구독
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
  return onSnapshot(
    q,
    snap => { cb(snap.docs.map(d => fromFirestore(d.id, d.data() as DocumentData))); },
    () => { cb([]); },
  );
}

// 히스토리: 오늘 이전 기록, 날짜 내림차순 (복합 인덱스 없이 클라이언트 정렬)
export async function getFoodHistory(
  coupleId: string,
  limitDays = 30,
): Promise<FoodLog[]> {
  const today = getTodayKST();
  const snap = await getDocs(query(
    collection(db, 'foodLogs'),
    where('coupleId', '==', coupleId),
    limit(limitDays * 4 * 2 + 20),
  ));
  return snap.docs
    .map(d => fromFirestore(d.id, d.data() as DocumentData))
    .filter(l => l.date < today)
    .sort((a, b) => b.date.localeCompare(a.date) || a.mealType.localeCompare(b.mealType));
}
