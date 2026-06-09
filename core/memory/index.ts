import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

import { subscribeEvents } from '../calendar';
import { CalendarEvent } from '../calendar/schema';
import { db } from '../config/firebase';

export type EventPhoto = {
  id: string;
  eventId: string;
  coupleId: string;
  storagePath: string;
  thumbnailPath: string;
  originalUrl: string;
  thumbUrl: string;
  width: number;
  height: number;
};

export function useCalendarEvents(
  coupleId: string | null,
  range: { from: Date; to: Date },
): { events: CalendarEvent[]; loading: boolean } {
  const [events, setEvents]   = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coupleId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeEvents(coupleId, range, (evs) => {
      setEvents(evs);
      setLoading(false);
    });
    return unsub;
  // range는 useMemo로 메모이즈된 객체를 기대. 객체 자체가 아닌 from/to 원시값으로 의존
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId, range.from.getTime(), range.to.getTime()]);

  return { events, loading };
}

export function useEventPhotos(eventId: string | null): { photos: EventPhoto[]; loading: boolean } {
  const [photos, setPhotos]   = useState<EventPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) {
      setPhotos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, 'photos'), where('eventId', '==', eventId));
    const unsub = onSnapshot(q, (snap) => {
      setPhotos(snap.docs.map(d => ({ id: d.id, ...d.data() } as EventPhoto)));
      setLoading(false);
    });
    return unsub;
  }, [eventId]);

  return { photos, loading };
}
