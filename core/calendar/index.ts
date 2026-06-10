import {
  addDoc,
  collection,
  deleteField,
  doc,
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

export type { CalendarEvent, CalendarEventInput } from './schema';
