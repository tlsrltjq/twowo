import { checkLines, LINES } from '../checkLines';

describe('[BR-5] checkLines', () => {
  test('LINES 배열은 정확히 12개(가로5 + 세로5 + 대각2)', () => {
    expect(LINES).toHaveLength(12);
  });

  test('[BR-5] 가로 첫 줄(0~4) 완성 감지', () => {
    const checked: Record<string, true> = { '0': true, '1': true, '2': true, '3': true, '4': true };
    const lines = checkLines(checked);
    expect(lines).toContain(0); // LINES[0] = [0,1,2,3,4]
  });

  test('[BR-5] 세로 첫 열(0,5,10,15,20) 완성 감지', () => {
    const checked: Record<string, true> = { '0': true, '5': true, '10': true, '15': true, '20': true };
    const lines = checkLines(checked);
    expect(lines).toContain(5); // LINES[5] = [0,5,10,15,20]
  });

  test('[BR-5] 좌→우 대각선(0,6,12,18,24) 완성 감지', () => {
    const checked: Record<string, true> = { '0': true, '6': true, '12': true, '18': true, '24': true };
    const lines = checkLines(checked);
    expect(lines).toContain(10); // LINES[10] = [0,6,12,18,24]
  });

  test('[BR-5] 우→좌 대각선(4,8,12,16,20) 완성 감지', () => {
    const checked: Record<string, true> = { '4': true, '8': true, '12': true, '16': true, '20': true };
    const lines = checkLines(checked);
    expect(lines).toContain(11); // LINES[11] = [4,8,12,16,20]
  });

  test('[BR-5] 미완성 줄은 반환하지 않는다', () => {
    const checked: Record<string, true> = { '0': true, '1': true, '2': true, '3': true }; // 4개만
    expect(checkLines(checked)).toHaveLength(0);
  });

  test('[BR-5] 빈 체크 → 완성 라인 없음', () => {
    expect(checkLines({})).toHaveLength(0);
  });
});
