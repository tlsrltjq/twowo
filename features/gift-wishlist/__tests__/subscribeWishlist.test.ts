import { resetMockDb, seedMockDb } from '../../../__mocks__/firebase';

jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('../../../core/config/firebase', () => ({ db: {} }));

import { subscribeWishlist } from '../index';

beforeEach(() => resetMockDb());

const makeItem = (id: string, coupleId: string, createdAt: Date) => ({
  coupleId,
  addedBy: 'u1',
  name:    `선물 ${id}`,
  received: false,
  createdAt: { toDate: () => createdAt },
});

describe('subscribeWishlist', () => {
  it('[BR-GW5] 아이템 추가 후 콜백 호출', () => {
    seedMockDb('wishlistItems/w1', makeItem('w1', 'c1', new Date()));

    const cb = jest.fn();
    subscribeWishlist('c1', cb);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0]![0]).toHaveLength(1);
    expect(cb.mock.calls[0]![0][0].name).toBe('선물 w1');
  });

  it('다른 커플 아이템 필터링', () => {
    seedMockDb('wishlistItems/w1', makeItem('w1', 'c1', new Date()));
    seedMockDb('wishlistItems/w2', makeItem('w2', 'c2', new Date()));

    const cb = jest.fn();
    subscribeWishlist('c1', cb);

    expect(cb.mock.calls[0]![0]).toHaveLength(1);
    expect(cb.mock.calls[0]![0][0].coupleId).toBe('c1');
  });

  it('received 필드 정확히 반환', () => {
    seedMockDb('wishlistItems/w1', {
      ...makeItem('w1', 'c1', new Date()),
      received: true,
    });

    const cb = jest.fn();
    subscribeWishlist('c1', cb);

    expect(cb.mock.calls[0]![0][0].received).toBe(true);
  });
});
