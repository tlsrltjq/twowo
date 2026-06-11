import type { CalendarEvent } from '../../../core/calendar';
import { getUpcomingRange, sliceUpcoming, UPCOMING_DAYS, UPCOMING_LIMIT } from '../upcomingEvents';

const makeEvent = (id: string, date: Date): CalendarEvent =>
  ({ id, date, type: 'general', title: id, coupleId: 'c1', createdBy: 'u1', photoIds: [] } as unknown as CalendarEvent);

describe('[BR-3] 다가오는 일정 — 오늘~7일, date asc, 최대 3개', () => {
  test('getUpcomingRange — from은 오늘 00:00, to는 +7일', () => {
    const today = new Date('2024-03-15T14:30:00');
    const { from, to } = getUpcomingRange(today);

    expect(from.getHours()).toBe(0);
    expect(from.getMinutes()).toBe(0);
    expect(from.getFullYear()).toBe(2024);
    expect(from.getMonth()).toBe(2);
    expect(from.getDate()).toBe(15);

    const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(UPCOMING_DAYS);
    expect(UPCOMING_DAYS).toBe(7);
  });

  test('sliceUpcoming — 5개 이벤트 → 3개 반환', () => {
    const events = [1, 2, 3, 4, 5].map(i => makeEvent(`e${i}`, new Date(2024, 0, i)));
    const result = sliceUpcoming(events);
    expect(result).toHaveLength(UPCOMING_LIMIT);
    expect(UPCOMING_LIMIT).toBe(3);
  });

  test('sliceUpcoming — 2개 이벤트 → 그대로 2개', () => {
    const events = [1, 2].map(i => makeEvent(`e${i}`, new Date(2024, 0, i)));
    expect(sliceUpcoming(events)).toHaveLength(2);
  });

  test('sliceUpcoming — 순서 보존 (date asc는 Firestore 쿼리 책임)', () => {
    const e1 = makeEvent('e1', new Date(2024, 0, 1));
    const e2 = makeEvent('e2', new Date(2024, 0, 3));
    const e3 = makeEvent('e3', new Date(2024, 0, 5));
    const [r0, r1, r2] = sliceUpcoming([e1, e2, e3]);
    expect(r0?.id).toBe('e1');
    expect(r1?.id).toBe('e2');
    expect(r2?.id).toBe('e3');
  });
});
