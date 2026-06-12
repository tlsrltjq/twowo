export function getDateKey(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function formatDateLabel(date: Date | null): string {
  if (!date) return '';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const key = getDateKey(date);
  if (key === getDateKey(today))     return '오늘';
  if (key === getDateKey(yesterday)) return '어제';
  if (date.getFullYear() === today.getFullYear()) {
    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
  }
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}
