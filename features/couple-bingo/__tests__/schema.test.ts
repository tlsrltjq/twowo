import { getMockDb, resetMockDb } from '../../../__mocks__/firebase';
import { startBoard } from '../index';

jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('../../../core/config/firebase', () => ({ db: {} }));

const ITEMS_25 = Array.from({ length: 25 }, (_, i) => `항목${i + 1}`);

beforeEach(() => resetMockDb());

describe('BingoBoard 스키마 유효성', () => {
  test('[BR-2] items.length가 25가 아니면 시작 거부 (26개)', async () => {
    await expect(
      startBoard('couple1', [...ITEMS_25, '항목26']),
    ).rejects.toThrow();
  });

  test('[BR-2] items.length가 25가 아니면 시작 거부 (24개)', async () => {
    await expect(
      startBoard('couple1', ITEMS_25.slice(0, 24)),
    ).rejects.toThrow();
  });

  test('[BR-8] 항목 텍스트 51자 초과 거부', async () => {
    const items = [...ITEMS_25];
    items[0] = 'a'.repeat(51);
    await expect(startBoard('couple1', items)).rejects.toThrow();
  });

  test('[BR-8] 항목 텍스트 정확히 50자는 허용', async () => {
    const items = [...ITEMS_25];
    items[0] = 'a'.repeat(50);
    const id = await startBoard('couple1', items);
    expect(typeof id).toBe('string');
    expect(getMockDb().get(`bingoBoards/${id}`)!.items[0]).toBe('a'.repeat(50));
  });
});
