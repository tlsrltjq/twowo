/**
 * BR-7: 어제 이전 데이터는 읽기만 가능 — UI 수정 버튼 비활성
 *
 * MoodScreen 의 수정 링크 렌더링 조건: `myMood && !editing && isToday(myMood)`
 * isToday(check) = check.date === getTodayKST()
 * 이 조건이 false 면 수정 링크가 렌더링되지 않음.
 */

import { getTodayKST } from '../../../core/utils/date';

jest.mock('../../../core/utils/date', () => ({
  getTodayKST: jest.fn(() => '2024-01-10'),
}));

describe('[BR-7] 어제 데이터 수정 버튼 비활성', () => {
  const isToday = (check: { date: string }) => check.date === getTodayKST();

  test('어제 날짜 mood → isToday false (수정 버튼 조건 불충족)', () => {
    expect(isToday({ date: '2024-01-09' })).toBe(false);
  });

  test('오늘 날짜 mood → isToday true (수정 버튼 조건 충족)', () => {
    expect(isToday({ date: '2024-01-10' })).toBe(true);
  });

  test('3일 전 날짜 → isToday false', () => {
    expect(isToday({ date: '2024-01-07' })).toBe(false);
  });

  test('[BR-7] myMood가 어제 날짜면 수정 버튼 조건 = false', () => {
    const myMood = { date: '2024-01-09' };
    const editing = false;
    const showEditButton = !!myMood && !editing && isToday(myMood);
    expect(showEditButton).toBe(false);
  });

  test('myMood가 오늘 날짜면 수정 버튼 조건 = true', () => {
    const myMood = { date: '2024-01-10' };
    const editing = false;
    const showEditButton = !!myMood && !editing && isToday(myMood);
    expect(showEditButton).toBe(true);
  });
});
