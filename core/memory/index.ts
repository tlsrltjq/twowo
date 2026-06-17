import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

import { subscribeEvents, subscribeEventsByType, subscribeEventsSince } from '../calendar';
import { CalendarEvent } from '../calendar/schema';
import { db } from '../config/firebase';
import { toLocalYMD } from '../utils/date';

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

// coupleId null 시 구독 즉시 해제 (lazy subscription — 해당 탭 활성 시에만 사용)
export function useCalendarEventsByType(
  coupleId: string | null,
  type: string,
): { events: CalendarEvent[]; loading: boolean } {
  const [events, setEvents]   = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coupleId) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeEventsByType(coupleId, type, (evs) => {
      setEvents(evs);
      setLoading(false);
    });
    return unsub;
  }, [coupleId, type]);

  return { events, loading };
}

// 사진 탭 전용: 최근 2년 이벤트에서 사진 있는 것만 구독
// coupleId null 시 구독 안 함 (lazy — 사진 탭 활성 시에만 사용)
export function usePhotoEvents(
  coupleId: string | null,
): { events: CalendarEvent[]; loading: boolean } {
  const [events, setEvents]   = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const since = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 2);
    return d;
  }, []);

  useEffect(() => {
    if (!coupleId) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeEventsSince(coupleId, since, (evs) => {
      setEvents(evs.filter(ev => ev.photoIds.length > 0));
      setLoading(false);
    });
    return unsub;
  }, [coupleId, since]);

  return { events, loading };
}

// 달력 그리드용 — 사진이 첨부된 이벤트 날짜마다 대표 썸네일(첫 photoId) 1장만 로드
export function useEventThumbnails(events: CalendarEvent[]): Record<string, string> {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  const photoRefs = useMemo(
    () => events
      .filter(ev => ev.photoIds.length > 0)
      .map(ev => ({ dateKey: toLocalYMD(ev.date), photoId: ev.photoIds[ev.photoIds.length - 1]! })),
    [events],
  );

  useEffect(() => {
    if (photoRefs.length === 0) {
      setThumbnails({});
      return;
    }
    let cancelled = false;
    Promise.all(
      photoRefs.map(({ dateKey, photoId }) =>
        getDoc(doc(db, 'photos', photoId)).then(snap => {
          const url = snap.exists() ? (snap.data()?.thumbUrl as string | undefined) : undefined;
          return { dateKey, url };
        }),
      ),
    ).then(results => {
      if (cancelled) return;
      const map: Record<string, string> = {};
      results.forEach(r => { if (r.url) map[r.dateKey] = r.url; });
      setThumbnails(map);
    }).catch(err => {
      console.error('[useEventThumbnails] getDoc failed:', err);
    });
    return () => { cancelled = true; };
  }, [photoRefs]);

  return thumbnails;
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
    }, (err) => {
      console.error('[useEventPhotos] snapshot error:', err);
      setLoading(false);
    });
    return unsub;
  }, [eventId]);

  return { photos, loading };
}
