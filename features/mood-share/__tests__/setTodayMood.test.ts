jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('../../../core/config/firebase', () => ({ db: {} }));

import * as dateUtils from '../../../core/utils/date';
import { seedMockDb, resetMockDb } from '../../../__mocks__/firebase';
import { setTodayMood } from '../index';
import { MoodLockedError } from '../schema';

const BASE_INPUT = {
  coupleId: 'couple1',
  userId:   'user1',
  energy:   3 as const,
  mood:     'good' as const,
  canMeet:  true,
};

beforeEach(() => {
  resetMockDb();
  jest.spyOn(dateUtils, 'getTodayKST').mockReturnValue('2026-06-09');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('[BR-2/3] setTodayMood', () => {
  test('[BR-3] 항상 getTodayKST() 기준 날짜로 저장 — 날짜 파라미터 없음', async () => {
    const result = await setTodayMood(BASE_INPUT);
    expect(result.date).toBe('2026-06-09');
    expect(result.coupleId).toBe('couple1');
    expect(result.energy).toBe(3);
  });

  test('[BR-3] 같은 날 두 번째 호출 → update (에러 없음)', async () => {
    await setTodayMood(BASE_INPUT);
    const second = await setTodayMood({ ...BASE_INPUT, energy: 5, mood: 'great' });
    expect(second.energy).toBe(5);
    expect(second.mood).toBe('great');
  });

  test('[BR-2] 기존 문서 date 필드가 오늘과 다르면 MoodLockedError', async () => {
    const docId = 'couple1_user1_2026-06-09';
    seedMockDb(`moodChecks/${docId}`, {
      coupleId: 'couple1', userId: 'user1',
      date: '2026-06-08', // 어제 날짜 데이터가 오늘 docId에 있는 비정상 상태
      energy: 3, mood: 'good', canMeet: true,
      createdAt: { toDate: () => new Date() },
      updatedAt: { toDate: () => new Date() },
    });
    await expect(setTodayMood(BASE_INPUT)).rejects.toThrow(MoodLockedError);
  });

  test('[BR-3] 결과 id는 {coupleId}_{userId}_{date} 형식', async () => {
    const result = await setTodayMood(BASE_INPUT);
    expect(result.id).toBe('couple1_user1_2026-06-09');
  });

  test('메모 있는 경우 저장', async () => {
    const result = await setTodayMood({ ...BASE_INPUT, memo: '오늘 좀 피곤해' });
    expect(result.memo).toBe('오늘 좀 피곤해');
  });

  test('메모 없는 경우 undefined', async () => {
    const result = await setTodayMood(BASE_INPUT);
    expect(result.memo).toBeUndefined();
  });
});
