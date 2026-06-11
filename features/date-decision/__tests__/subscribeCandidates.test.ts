import { resetMockDb, seedMockDb } from '../../../__mocks__/firebase';
import { subscribeCandidates } from '../index';

jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('../../../core/config/firebase', () => ({ db: {} }));

beforeEach(() => resetMockDb());

describe('subscribeCandidates', () => {
  test('[BR-1] 후보 추가 후 구독 콜백에서 즉시 반영된다', () => {
    seedMockDb('dateCandidates/cand1', {
      coupleId: 'couple1', title: '홍대 카페', category: 'food',
      createdBy: 'user1', createdAt: { toDate: () => new Date() },
    });
    seedMockDb('dateCandidates/cand2', {
      coupleId: 'couple1', title: '한강 피크닉', category: 'activity',
      createdBy: 'user2', createdAt: { toDate: () => new Date() },
    });

    const cb = jest.fn();
    subscribeCandidates('couple1', cb);

    expect(cb).toHaveBeenCalled();
    const candidates: { title: string }[] = cb.mock.calls[0][0];
    expect(candidates).toHaveLength(2);
    expect(candidates.map(c => c.title)).toContain('홍대 카페');
    expect(candidates.map(c => c.title)).toContain('한강 피크닉');
  });

  test('[BR-1] 다른 커플 후보는 콜백에 포함되지 않는다', () => {
    seedMockDb('dateCandidates/cand1', {
      coupleId: 'couple2', title: '다른 커플 후보', category: 'etc',
      createdBy: 'user3', createdAt: { toDate: () => new Date() },
    });

    const cb = jest.fn();
    subscribeCandidates('couple1', cb);

    expect(cb.mock.calls[0][0]).toHaveLength(0);
  });

  test('[BR-1] 후보 없을 때 빈 배열을 반환한다', () => {
    const cb = jest.fn();
    subscribeCandidates('couple1', cb);
    expect(cb).toHaveBeenCalledWith([]);
  });
});
