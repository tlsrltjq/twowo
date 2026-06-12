export function tsToDate(value: unknown): Date {
  if (value != null && typeof (value as Record<string, unknown>).toDate === 'function') {
    return (value as { toDate(): Date }).toDate();
  }
  if (value instanceof Date) return value;
  return new Date();
}
