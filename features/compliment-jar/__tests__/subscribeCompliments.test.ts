import { resetMockDb, seedMockDb } from '../../../__mocks__/firebase';
import { subscribeCompliments } from '../index';

jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('../../../core/config/firebase', () => ({ db: {} }));

beforeEach(() => resetMockDb());

const makeCompliment = (id: string, coupleId: string, createdAt: Date) => ({
  coupleId,
  fromUid: 'u1',
  toUid: 'u2',
  text: `칭찬 ${id}`,
  createdAt: { toDate: () => createdAt },
});

describe('subscribeCompliments', () => {
  it('[BR-CJ4] 새 칭찬 추가 후 콜백 호출', () => {
    seedMockDb('compliments/c1', makeCompliment('c1', 'couple1', new Date('2026-06-10T10:00:00Z')));

    const cb = jest.fn();
    subscribeCompliments('couple1', cb);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0]![0]).toHaveLength(1);
    expect(cb.mock.calls[0]![0][0].text).toBe('칭찬 c1');
  });

  it('[BR-CJ5] createdAt DESC 정렬 확인 — 최신이 먼저', () => {
    const older = new Date('2026-06-09T10:00:00Z');
    const newer = new Date('2026-06-10T10:00:00Z');

    seedMockDb('compliments/old', makeCompliment('old', 'couple1', older));
    seedMockDb('compliments/new', makeCompliment('new', 'couple1', newer));

    const cb = jest.fn();
    subscribeCompliments('couple1', cb);

    const results = cb.mock.calls[0]![0];
    expect(results).toHaveLength(2);
    expect(results[0].text).toBe('칭찬 new');
    expect(results[1].text).toBe('칭찬 old');
  });

  it('다른 커플 칭찬은 필터링', () => {
    seedMockDb('compliments/c1', makeCompliment('c1', 'couple1', new Date()));
    seedMockDb('compliments/c2', makeCompliment('c2', 'couple2', new Date()));

    const cb = jest.fn();
    subscribeCompliments('couple1', cb);

    const results = cb.mock.calls[0]![0];
    expect(results).toHaveLength(1);
    expect(results[0].coupleId).toBe('couple1');
  });
});
