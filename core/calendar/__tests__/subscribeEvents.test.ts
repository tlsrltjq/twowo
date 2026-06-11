import { resetMockDb, seedMockDb } from '../../../__mocks__/firebase';
import { subscribeEvents,subscribeEventsByType } from '../index';

const mockFirestore = require('../../../__mocks__/firebase');

jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('firebase/storage', () => ({ deleteObject: jest.fn(), ref: jest.fn() }));
jest.mock('../../config/firebase', () => ({ db: {}, storage: {} }));

const makeStoredEvent = (id: string, type: string, dateMs: number) => ({
  coupleId: 'c1',
  type,
  title: `event-${id}`,
  date:     { toDate: () => new Date(dateMs), toMillis: () => dateMs },
  endDate:  null,
  createdAt: { toDate: () => new Date(0), toMillis: () => 0 },
  updatedAt: { toDate: () => new Date(0), toMillis: () => 0 },
  photoIds: [],
});

beforeEach(() => {
  resetMockDb();
  jest.clearAllMocks();
});

describe('[BR-10] subscribeEventsByType — date desc 정렬', () => {
  test('orderBy("date", "desc") 로 쿼리 생성', () => {
    const orderBySpy = jest.spyOn(mockFirestore, 'orderBy');
    subscribeEventsByType('c1', 'photo', jest.fn());
    expect(orderBySpy).toHaveBeenCalledWith('date', 'desc');
  });

  test('type 필터링 — photo만 반환, exercise 제외', () => {
    seedMockDb('calendarEvents/e1', makeStoredEvent('e1', 'photo', Date.UTC(2024, 0, 1)));
    seedMockDb('calendarEvents/e2', makeStoredEvent('e2', 'exercise', Date.UTC(2024, 0, 2)));

    const result: any[] = [];
    subscribeEventsByType('c1', 'photo', (evs) => result.push(...evs));

    expect(result.every(e => e.type === 'photo')).toBe(true);
    expect(result.some(e => e.type === 'exercise')).toBe(false);
  });

  test('coupleId 필터링 — 다른 커플 이벤트 제외', () => {
    seedMockDb('calendarEvents/e1', makeStoredEvent('e1', 'photo', Date.UTC(2024, 0, 1)));
    seedMockDb('calendarEvents/e2', { ...makeStoredEvent('e2', 'photo', Date.UTC(2024, 0, 2)), coupleId: 'c2' });

    const result: any[] = [];
    subscribeEventsByType('c1', 'photo', (evs) => result.push(...evs));

    expect(result.every(e => e.coupleId === 'c1')).toBe(true);
    expect(result).toHaveLength(1);
  });
});

describe('subscribeEvents — date asc 정렬 (범위 구독)', () => {
  test('orderBy("date", "asc") 로 쿼리 생성', () => {
    const orderBySpy = jest.spyOn(mockFirestore, 'orderBy');
    subscribeEvents('c1', { from: new Date(), to: new Date() }, jest.fn());
    // orderBy 기본값은 'asc'
    expect(orderBySpy).toHaveBeenCalledWith('date', 'asc');
  });
});
