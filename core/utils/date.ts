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

// 캘린더 화면 전용 — 로컬 타임존 무관, ISO(UTC) 기준 'YYYY-MM-DD' (기존 calendar.tsx 관례 유지)
export function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// 로컬 타임존 기준 'YYYY-MM-DD' — react-native-calendars의 date.dateString 과 매칭
export function toLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseYMD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);
}

export function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

export function startOfWeek(d: Date): Date {
  const date = new Date(d);
  date.setDate(date.getDate() - date.getDay());
  date.setHours(0, 0, 0, 0);
  return date;
}

export type AnniversaryMarker = { dateString: string; label: string; isYearly: boolean };

// 사귀기 시작한 날(base)부터 [from, to] 범위 내의 100일·주년 마커 목록 반환.
// 100일: base +99일, +199일, ... (N×100 번째 날)
// 주년: 같은 월일로 N년 후 (주년이 100일과 겹치면 주년 우선)
export function getAnniversaryMarkers(base: Date, from: Date, to: Date): AnniversaryMarker[] {
  const markers: AnniversaryMarker[] = [];

  // 만난날 (기념일 당일)
  if (base >= from && base <= to) {
    markers.push({ dateString: toLocalYMD(base), label: '만난날', isYearly: true });
  }

  // 주년
  for (let year = 1; year <= 100; year++) {
    const d = new Date(base.getFullYear() + year, base.getMonth(), base.getDate());
    if (d > to) break;
    if (d >= from) markers.push({ dateString: toLocalYMD(d), label: `${year}주년`, isYearly: true });
  }

  // 100일 (만난날·주년과 겹치면 제외)
  const yearlySet = new Set(markers.map(m => m.dateString));
  for (let n = 1; n <= 5000; n++) {
    const d = addDays(base, n * 100 - 1);
    if (d > to) break;
    if (d >= from) {
      const ds = toLocalYMD(d);
      if (!yearlySet.has(ds)) markers.push({ dateString: ds, label: `${n * 100}일`, isYearly: false });
    }
  }

  return markers;
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
