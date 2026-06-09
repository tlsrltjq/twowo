import { getTodayKST, nowKST, getDaysSince } from './date';

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

describe('getDaysSince', () => {
  const RealDate2 = global.Date;
  afterEach(() => { global.Date = RealDate2; });

  function mockUTC2(isoString: string) {
    const fixed = new RealDate2(isoString).getTime();
    const MockDate = class extends RealDate2 {
      static now() { return fixed; }
    } as unknown as typeof Date;
    global.Date = MockDate;
  }

  it('[BR-2] 기준일부터 오늘까지 경과 일수를 반환한다', () => {
    mockUTC2('2026-06-09T01:00:00Z'); // KST 2026-06-09 10:00
    expect(getDaysSince('2026-06-09')).toBe(0);
    expect(getDaysSince('2026-06-08')).toBe(1);
    expect(getDaysSince('2026-01-01')).toBe(159);
  });
});
