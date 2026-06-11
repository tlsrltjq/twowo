import type { CalendarEvent } from '../../core/calendar';

export const UPCOMING_DAYS = 7;
export const UPCOMING_LIMIT = 3;

export function getUpcomingRange(today: Date): { from: Date; to: Date } {
  const from = new Date(today);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + UPCOMING_DAYS);
  return { from, to };
}

export function sliceUpcoming(events: CalendarEvent[]): CalendarEvent[] {
  return events.slice(0, UPCOMING_LIMIT);
}
