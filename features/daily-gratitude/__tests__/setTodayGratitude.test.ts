import { resetMockDb, seedMockDb } from '../../../__mocks__/firebase';
import * as dateUtils from '../../../core/utils/date';
import { setTodayGratitude } from '../index';
import { GratitudeLockError } from '../schema';

jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('../../../core/config/firebase', () => ({ db: {} }));

const BASE = {
  coupleId: 'couple1',
  userId:   'user1',
  message:  '오늘 맛있는 거 사줘서 고마워',
};

beforeEach(() => {
  resetMockDb();
  jest.spyOn(dateUtils, 'getTodayKST').mockReturnValue('2026-06-11');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('[BR-1/2] setTodayGratitude', () => {
  test('[BR-1] 결과에 오늘 날짜가 담긴다', async () => {
    const result = await setTodayGratitude(BASE);
    expect(result.date).toBe('2026-06-11');
    expect(result.coupleId).toBe('couple1');
    expect(result.message).toBe('오늘 맛있는 거 사줘서 고마워');
  });

  test('[BR-1] id 형식은 {coupleId}_{userId}_{date}', async () => {
    const result = await setTodayGratitude(BASE);
    expect(result.id).toBe('couple1_user1_2026-06-11');
  });

  test('[BR-1] 같은 날 두 번째 호출(수정) → 에러 없음, 메시지 갱신', async () => {
    await setTodayGratitude(BASE);
    const second = await setTodayGratitude({ ...BASE, message: '저녁도 맛있었어' });
    expect(second.message).toBe('저녁도 맛있었어');
  });

  test('[BR-2] 기존 문서 date가 오늘과 다르면 GratitudeLockError', async () => {
    seedMockDb('gratitudeEntries/couple1_user1_2026-06-11', {
      coupleId: 'couple1', userId: 'user1',
      date: '2026-06-10', // 어제 날짜가 오늘 docId에 존재하는 비정상 상태
      message: '어제 고마웠어',
      createdAt: { toDate: () => new Date() },
      updatedAt: { toDate: () => new Date() },
    });
    await expect(setTodayGratitude(BASE)).rejects.toThrow(GratitudeLockError);
  });

  test('[BR-3] 100자 message → 저장', async () => {
    const result = await setTodayGratitude({ ...BASE, message: 'a'.repeat(100) });
    expect(result.message).toHaveLength(100);
  });
});
