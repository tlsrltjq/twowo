import { getTodayKST, nowKST } from './date';

describe('getTodayKST', () => {
  const RealDate = global.Date;

  afterEach(() => {
    global.Date = RealDate;
  });

  function mockUTC(isoString: string) {
    const fixed = new RealDate(isoString).getTime();
    const MockDate = class extends RealDate {
      static now() { return fixed; }
    } as unknown as typeof Date;
    global.Date = MockDate;
  }

  it('[BR-1] 한국(KST UTC+9) 기준 날짜를 YYYY-MM-DD 형식으로 반환한다', () => {
    mockUTC('2026-05-21T10:00:00Z'); // UTC 10시 = KST 19시 → 같은 날
    expect(getTodayKST()).toBe('2026-05-21');
  });

  it('[BR-1] UTC 23:30 → KST 다음날 08:30 → 다음날 날짜 반환', () => {
    mockUTC('2026-05-20T23:30:00Z'); // UTC 5/20 23:30 = KST 5/21 08:30
    expect(getTodayKST()).toBe('2026-05-21');
  });

  it('[BR-1] UTC 자정 직전(23:59) → KST는 익일 08:59', () => {
    mockUTC('2026-05-21T23:59:00Z');
    expect(getTodayKST()).toBe('2026-05-22');
  });

  it('[BR-1] UTC 00:01 → KST 09:01 → 같은 날', () => {
    mockUTC('2026-05-21T00:01:00Z');
    expect(getTodayKST()).toBe('2026-05-21');
  });

  it('[BR-2] nowKST()는 KST 기준 Date 객체를 반환한다', () => {
    mockUTC('2026-05-21T15:00:00Z'); // KST 2026-05-22 00:00
    const kst = nowKST();
    expect(kst.getUTCDate()).toBe(22);
  });
});
