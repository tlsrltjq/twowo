import {
  addDoc,
  collection,
  deleteField,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '../config/firebase';
import { deleteEvent } from './deleteEvent';
import { CalendarEvent, CalendarEventInput } from './schema';

function toFirestore(input: CalendarEventInput) {
  const doc: Record<string, unknown> = {
    coupleId:  input.coupleId,
    createdBy: input.createdBy,
    type:      input.type,
    title:     input.title,
    date:      Timestamp.fromDate(input.date),
    endDate:   input.endDate ? Timestamp.fromDate(input.endDate) : null,
    photoIds:  [],
  };
  if (input.placeName != null) doc.placeName = input.placeName;
  if (input.memo      != null) doc.memo      = input.memo;
  return doc;
}

function fromFirestore(id: string, data: Record<string, unknown>): CalendarEvent {
  return {
    ...(data as Omit<CalendarEvent, 'id' | 'date' | 'endDate' | 'createdAt' | 'updatedAt'>),
    id,
    date:      (data.date as Timestamp).toDate(),
    endDate:   data.endDate ? (data.endDate as Timestamp).toDate() : undefined,
    createdAt: (data.createdAt as Timestamp).toDate(),
    updatedAt: (data.updatedAt as Timestamp).toDate(),
    photoIds:  Array.isArray(data.photoIds) ? (data.photoIds as string[]) : [],
  };
}

export async function createEvent(input: CalendarEventInput): Promise<string> {
  const now = Timestamp.now();
  const ref = await addDoc(collection(db, 'calendarEvents'), {
    ...toFirestore(input),
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateEvent(id: string, patch: Partial<CalendarEventInput>): Promise<void> {
  const data: Record<string, unknown> = { updatedAt: Timestamp.now() };
  if (patch.type      !== undefined) data.type      = patch.type;
  if (patch.title     !== undefined) data.title     = patch.title;
  if (patch.date      !== undefined) data.date      = Timestamp.fromDate(patch.date);
  if (patch.endDate   !== undefined) data.endDate   = patch.endDate ? Timestamp.fromDate(patch.endDate) : null;
  // 'key' in patch 로 의도적 undefined(필드 삭제) 감지
  if ('placeName' in patch) data.placeName = patch.placeName ?? deleteField();
  if ('memo'      in patch) data.memo      = patch.memo      ?? deleteField();
  await updateDoc(doc(db, 'calendarEvents', id), data);
}

export { deleteEvent };

export function subscribeEvents(
  coupleId: string,
  range: { from: Date; to: Date },
  cb: (events: CalendarEvent[]) => void,
): () => void {
  const q = query(
    collection(db, 'calendarEvents'),
    where('coupleId', '==', coupleId),
    where('date', '>=', Timestamp.fromDate(range.from)),
    where('date', '<=', Timestamp.fromDate(range.to)),
    orderBy('date', 'asc'),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map(d => fromFirestore(d.id, d.data() as Record<string, unknown>)));
  });
}

// coupleId+type+date DESC 복합 인덱스 사용 (firestore.indexes.json 4번째 항목)
// maxCount: 최근 N개로 제한 (기본 100). 장기 사용 시 무제한 read 방지.
export function subscribeEventsByType(
  coupleId: string,
  type: string,
  cb: (events: CalendarEvent[]) => void,
  maxCount = 100,
): () => void {
  const q = query(
    collection(db, 'calendarEvents'),
    where('coupleId', '==', coupleId),
    where('type', '==', type),
    orderBy('date', 'desc'),
    limit(maxCount),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map(d => fromFirestore(d.id, d.data() as Record<string, unknown>)));
  });
}

// 사진 탭 전용: 특정 날짜 이후의 모든 타입 이벤트 구독
// 기존 3종 병렬 구독 대신 단일 range 쿼리로 대체 (coupleId+date DESC 인덱스 사용)
// maxCount: 최대 200개로 서버 사이드 차단. 2년치 이벤트에서 사진 있는 것만 필터해도 충분한 값.
export function subscribeEventsSince(
  coupleId: string,
  since: Date,
  cb: (events: CalendarEvent[]) => void,
  maxCount = 200,
): () => void {
  const q = query(
    collection(db, 'calendarEvents'),
    where('coupleId', '==', coupleId),
    where('date', '>=', Timestamp.fromDate(since)),
    orderBy('date', 'desc'),
    limit(maxCount),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map(d => fromFirestore(d.id, d.data() as Record<string, unknown>)));
  });
}

export type { CalendarEvent, CalendarEventInput } from './schema';
