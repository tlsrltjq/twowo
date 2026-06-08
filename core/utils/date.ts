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

export function isBeforeMidnightKST(date: Date): boolean {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const todayKST = nowKST();
  return (
    kst.getUTCFullYear() === todayKST.getUTCFullYear() &&
    kst.getUTCMonth() === todayKST.getUTCMonth() &&
    kst.getUTCDate() === todayKST.getUTCDate()
  );
}
