import { resetMockDb, seedMockDb } from '../../../__mocks__/firebase';
import { subscribeFirstMoments } from '../index';

jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('../../../core/config/firebase', () => ({ db: {} }));
jest.mock('../../../core/utils/date', () => ({ getTodayKST: () => '2026-06-10' }));

beforeEach(() => resetMockDb());

const makeMoment = (id: string, coupleId: string, date: string) => ({
  coupleId,
  addedBy: 'u1',
  title:   `처음 ${id}`,
  date,
  createdAt: { toDate: () => new Date() },
});

describe('subscribeFirstMoments', () => {
  it('[BR-FM4] 새 기록 추가 후 콜백 호출', () => {
    seedMockDb('firstMoments/m1', makeMoment('m1', 'c1', '2026-03-15'));

    const cb = jest.fn();
    subscribeFirstMoments('c1', cb);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0]![0]).toHaveLength(1);
    expect(cb.mock.calls[0]![0][0].title).toBe('처음 m1');
  });

  it('[BR-FM6] date ASC 정렬 확인 — 오래된 순서대로', () => {
    seedMockDb('firstMoments/newer', makeMoment('newer', 'c1', '2026-06-01'));
    seedMockDb('firstMoments/older', makeMoment('older', 'c1', '2026-01-01'));

    const cb = jest.fn();
    subscribeFirstMoments('c1', cb);

    const results = cb.mock.calls[0]![0];
    expect(results).toHaveLength(2);
    expect(results[0].date).toBe('2026-01-01');
    expect(results[1].date).toBe('2026-06-01');
  });

  it('다른 커플 기록 필터링', () => {
    seedMockDb('firstMoments/m1', makeMoment('m1', 'c1', '2026-01-01'));
    seedMockDb('firstMoments/m2', makeMoment('m2', 'c2', '2026-01-01'));

    const cb = jest.fn();
    subscribeFirstMoments('c1', cb);

    expect(cb.mock.calls[0]![0]).toHaveLength(1);
    expect(cb.mock.calls[0]![0][0].coupleId).toBe('c1');
  });
});
