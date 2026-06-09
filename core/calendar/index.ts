import {
  addDoc,
  collection,
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
  return {
    ...input,
    date:     Timestamp.fromDate(input.date),
    endDate:  input.endDate ? Timestamp.fromDate(input.endDate) : null,
    photoIds: [],
  };
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
  const data: Record<string, unknown> = { ...patch, updatedAt: Timestamp.now() };
  if (patch.date)    data.date    = Timestamp.fromDate(patch.date);
  if (patch.endDate) data.endDate = Timestamp.fromDate(patch.endDate);
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
