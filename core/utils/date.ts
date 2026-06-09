const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function nowKST(): Date {
  return new Date(Date.now() + KST_OFFSET_MS);
}

export function getTodayKST(): string {
  const kst = nowKST();
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 'YYYY-MM-DD' KST 날짜 기준으로 오늘까지 경과 일수 (D+N 계산)
export function getDaysSince(dateStr: string): number {
  const today = getTodayKST();
  const [ty = 0, tm = 1, td = 1] = today.split('-').map(Number);
  const [sy = 0, sm = 1, sd = 1] = dateStr.split('-').map(Number);
  const todayMs = Date.UTC(ty, tm - 1, td);
  const sinceMs = Date.UTC(sy, sm - 1, sd);
  return Math.floor((todayMs - sinceMs) / (1000 * 60 * 60 * 24));
}

export function isBeforeMidnightKST(date: Date): boolean {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const todayKST = nowKST();
  return (
    kst.getUTCFullYear() === todayKST.getUTCFullYear() &&
    kst.getUTCMonth() === todayKST.getUTCMonth() &&
    kst.getUTCDate() === todayKST.getUTCDate()
  );
}
