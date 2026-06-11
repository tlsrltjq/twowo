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

  test('[BR-4] 체크 시 checkedBy에 uid와 시각이 기록된다', async () => {
    seedMockDb('bingoBoards/board1', makeBoard());
    await toggleCell('board1', 'user1', 7);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const by = getMockDb().get('bingoBoards/board1')!.checkedBy['7'];
    expect(by.uid).toBe('user1');
    expect(by.at).toBeDefined();
  });

  test('[BR-4] 체크 해제 시 checkedBy에서 해당 항목이 제거된다', async () => {
    seedMockDb('bingoBoards/board1', makeBoard({ '7': true }));
    await toggleCell('board1', 'user1', 7);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(getMockDb().get('bingoBoards/board1')!.checkedBy['7']).toBeUndefined();
  });

  test('[BR-6] 25칸 모두 체크 시 status가 completed로 전환된다', async () => {
    const allButLast = Object.fromEntries(
      Array.from({ length: 24 }, (_, i) => [String(i), true]),
    ) as Record<string, true>;
    seedMockDb('bingoBoards/board1', makeBoard(allButLast));
    await toggleCell('board1', 'user1', 24);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(getMockDb().get('bingoBoards/board1')!.status).toBe('completed');
  });

  test('[BR-7] 라인 완성 시 newLines 배열에 해당 라인 인덱스가 포함된다', async () => {
    // 가로 첫 줄 0~3이 이미 체크된 상태에서 4번 체크 → 라인 0번 완성
    const partial = Object.fromEntries(
      [0, 1, 2, 3].map(i => [String(i), true]),
    ) as Record<string, true>;
    seedMockDb('bingoBoards/board1', makeBoard(partial));
    const result = await toggleCell('board1', 'user1', 4);
    expect(result.newLines).toContain(0); // LINES[0] = [0,1,2,3,4]
  });
});
