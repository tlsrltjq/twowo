import { useEffect, useState } from 'react';

import { subscribeEvents } from '../calendar';
import { CalendarEvent } from '../calendar/schema';

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
