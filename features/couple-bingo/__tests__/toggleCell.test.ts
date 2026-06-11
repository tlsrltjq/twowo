import { getMockDb, resetMockDb, seedMockDb } from '../../../__mocks__/firebase';
import { toggleCell } from '../index';

jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('../../../core/config/firebase', () => ({ db: {} }));

const makeBoard = (checkedItems: Record<string, true> = {}) => ({
  coupleId: 'couple1',
  status: 'active',
  items: Array.from({ length: 25 }, (_, i) => `항목${i + 1}`),
  checkedItems,
  checkedBy: {},
  completedLines: [],
});

beforeEach(() => resetMockDb());

describe('[BR-B4/5] toggleCell', () => {
  test('체크: checkedItems에 인덱스가 추가된다', async () => {
    seedMockDb('bingoBoards/board1', makeBoard());
    await toggleCell('board1', 'user1', 0);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(getMockDb().get('bingoBoards/board1')!.checkedItems['0']).toBe(true);
  });

  test('체크 해제: 이미 체크된 셀을 다시 토글하면 제거된다', async () => {
    seedMockDb('bingoBoards/board1', makeBoard({ '3': true }));
    await toggleCell('board1', 'user1', 3);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(getMockDb().get('bingoBoards/board1')!.checkedItems['3']).toBeUndefined();
  });

  test('newLines를 반환한다', async () => {
    seedMockDb('bingoBoards/board1', makeBoard());
    const result = await toggleCell('board1', 'user1', 0);
    expect(Array.isArray(result.newLines)).toBe(true);
  });

  test('존재하지 않는 보드는 에러', async () => {
    await expect(toggleCell('none', 'user1', 0)).rejects.toThrow('board not found');
  });
});
