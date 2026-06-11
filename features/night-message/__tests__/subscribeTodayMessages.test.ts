import { resetMockDb, seedMockDb } from '../../../__mocks__/firebase';
import { subscribeTodayMessages } from '../index';

jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('../../../core/config/firebase', () => ({ db: {} }));
jest.mock('../../../core/utils/date', () => ({ getTodayKST: () => '2026-06-10' }));

beforeEach(() => resetMockDb());

describe('subscribeTodayMessages', () => {
  it('[BR-NM3] 상대 메시지 저장 후 구독 콜백에서 partner 반환', () => {
    seedMockDb('nightMessages/couple1_partner1_2026-06-10_night', {
      coupleId: 'couple1',
      userId:   'partner1',
      date:     '2026-06-10',
      type:     'night',
      text:     '잘자 ♥',
      sentAt:   { toDate: () => new Date() },
    });

    const cb = jest.fn();
    subscribeTodayMessages('couple1', 'user1', 'partner1', 'night', cb);

    expect(cb).toHaveBeenCalledTimes(1);
    const [mine, partner] = cb.mock.calls[0];
    expect(mine).toBeNull();
    expect(partner?.text).toBe('잘자 ♥');
    expect(partner?.userId).toBe('partner1');
  });

  it('[BR-NM3] 내 메시지와 파트너 메시지 모두 올바르게 분류', () => {
    seedMockDb('nightMessages/couple1_user1_2026-06-10_morning', {
      coupleId: 'couple1', userId: 'user1', date: '2026-06-10',
      type: 'morning', text: '좋은 아침!', sentAt: { toDate: () => new Date() },
    });
    seedMockDb('nightMessages/couple1_partner1_2026-06-10_morning', {
      coupleId: 'couple1', userId: 'partner1', date: '2026-06-10',
      type: 'morning', text: '일어났어?', sentAt: { toDate: () => new Date() },
    });

    const cb = jest.fn();
    subscribeTodayMessages('couple1', 'user1', 'partner1', 'morning', cb);

    const [mine, partner] = cb.mock.calls[0];
    expect(mine?.text).toBe('좋은 아침!');
    expect(partner?.text).toBe('일어났어?');
  });

  it('[BR-NM4] 어제 메시지는 null 반환 (date 필터에 걸림)', () => {
    // 어제 날짜 메시지 seeding — query where date == '2026-06-10' 에 안 걸림
    seedMockDb('nightMessages/couple1_partner1_2026-06-09_night', {
      coupleId: 'couple1', userId: 'partner1', date: '2026-06-09',
      type: 'night', text: '어제 메시지', sentAt: { toDate: () => new Date() },
    });

    const cb = jest.fn();
    subscribeTodayMessages('couple1', 'user1', 'partner1', 'night', cb);

    const [mine, partner] = cb.mock.calls[0];
    expect(mine).toBeNull();
    expect(partner).toBeNull();
  });

  it('[BR-NM4] 다른 type(morning vs night) 메시지는 반환하지 않음', () => {
    seedMockDb('nightMessages/couple1_partner1_2026-06-10_morning', {
      coupleId: 'couple1', userId: 'partner1', date: '2026-06-10',
      type: 'morning', text: '아침 메시지', sentAt: { toDate: () => new Date() },
    });

    const cb = jest.fn();
    subscribeTodayMessages('couple1', 'user1', 'partner1', 'night', cb);

    const [mine, partner] = cb.mock.calls[0];
    expect(mine).toBeNull();
    expect(partner).toBeNull();
  });
});
