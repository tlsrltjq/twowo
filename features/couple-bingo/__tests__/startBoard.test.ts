import { getMockDb, resetMockDb, seedMockDb } from '../../../__mocks__/firebase';
import { startBoard } from '../index';

jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('../../../core/config/firebase', () => ({ db: {} }));

const ITEMS_25 = Array.from({ length: 25 }, (_, i) => `항목${i + 1}`);

beforeEach(() => resetMockDb());

describe('[BR-B1/3] startBoard', () => {
  test('25개 항목으로 보드를 생성하고 ID를 반환한다', async () => {
    const id = await startBoard('couple1', ITEMS_25);
    expect(typeof id).toBe('string');
    expect(id).toBeTruthy();
    const boards = [...getMockDb().entries()].filter(([k]) => k.startsWith('bingoBoards/'));
    expect(boards).toHaveLength(1);
    expect(boards[0]![1].status).toBe('active');
    expect(boards[0]![1].items).toEqual(ITEMS_25);
    expect(boards[0]![1].coupleId).toBe('couple1');
  });

  test('[BR-B3] 25개 미만이면 에러', async () => {
    await expect(startBoard('couple1', ITEMS_25.slice(0, 24))).rejects.toThrow('items must be exactly 25');
  });

  test('[BR-B3] 빈 항목(공백만) 포함 시 에러', async () => {
    const items = [...ITEMS_25];
    items[0] = '   ';
    await expect(startBoard('couple1', items)).rejects.toThrow('items cannot be empty');
  });

  test('[BR-B1] 기존 active 보드가 있으면 completed로 전환 후 새 보드 생성', async () => {
    seedMockDb('bingoBoards/old', {
      coupleId: 'couple1',
      status: 'active',
      items: ITEMS_25,
      checkedItems: {},
      checkedBy: {},
      completedLines: [],
    });
    await startBoard('couple1', ITEMS_25);
    const db = getMockDb();
    expect(db.get('bingoBoards/old')?.status).toBe('completed');
    const active = [...db.entries()].filter(([, v]) => v.status === 'active');
    expect(active).toHaveLength(1);
  });
});
