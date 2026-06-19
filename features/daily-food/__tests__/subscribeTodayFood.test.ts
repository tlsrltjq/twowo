import { resetMockDb, seedMockDb } from '../../../__mocks__/firebase';
import { subscribeTodayFood } from '../index';

jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('firebase/storage', () => ({ getDownloadURL: jest.fn(), ref: jest.fn(), uploadBytes: jest.fn() }));
jest.mock('expo-image-manipulator', () => ({ manipulateAsync: jest.fn(), SaveFormat: { JPEG: 'jpeg' } }));
jest.mock('../../../core/config/firebase', () => ({ db: {}, storage: {} }));
jest.mock('../../../core/utils/date', () => ({ getTodayKST: () => '2026-06-10' }));

beforeEach(() => resetMockDb());

const makeLog = (id: string, coupleId: string, date: string, loggedAt: Date) => ({
  coupleId,
  userId: 'u1',
  date,
  mealType: 'lunch',
  name: `메뉴 ${id}`,
  loggedAt: { toDate: () => loggedAt },
});

describe('subscribeTodayFood', () => {
  it('[BR-DF4] 새 로그 추가 후 콜백 호출', () => {
    seedMockDb('foodLogs/f1', makeLog('f1', 'c1', '2026-06-10', new Date('2026-06-10T12:00:00Z')));

    const cb = jest.fn();
    subscribeTodayFood('c1', cb);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0]![0]).toHaveLength(1);
    expect(cb.mock.calls[0]![0][0].name).toBe('메뉴 f1');
  });

  it('[BR-DF3] 어제 로그는 반환하지 않음', () => {
    seedMockDb('foodLogs/f1', makeLog('f1', 'c1', '2026-06-09', new Date()));

    const cb = jest.fn();
    subscribeTodayFood('c1', cb);

    expect(cb.mock.calls[0]![0]).toHaveLength(0);
  });

  it('다른 커플 로그 필터링', () => {
    seedMockDb('foodLogs/f1', makeLog('f1', 'c1', '2026-06-10', new Date()));
    seedMockDb('foodLogs/f2', makeLog('f2', 'c2', '2026-06-10', new Date()));

    const cb = jest.fn();
    subscribeTodayFood('c1', cb);

    expect(cb.mock.calls[0]![0]).toHaveLength(1);
    expect(cb.mock.calls[0]![0][0].coupleId).toBe('c1');
  });
});
