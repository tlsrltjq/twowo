import { resetMockDb, getMockDb } from '../../../__mocks__/firebase';

jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('../../../core/config/firebase', () => ({ db: {} }));
jest.mock('../../../core/utils/date', () => ({ getTodayKST: () => '2026-06-10' }));

import { logFood, deleteFood } from '../index';

beforeEach(() => resetMockDb());

describe('logFood', () => {
  it('[BR-DF1] 51자 reject', async () => {
    await expect(logFood('c1', 'u1', 'lunch', 'a'.repeat(51))).rejects.toThrow('1~50자');
  });

  it('[BR-DF1] 공백만 reject', async () => {
    await expect(logFood('c1', 'u1', 'lunch', '   ')).rejects.toThrow('1~50자');
  });

  it('[BR-DF2] 유효 mealType만 허용', async () => {
    await expect(logFood('c1', 'u1', 'brunch' as any, '메뉴')).rejects.toThrow('유효하지 않은');
  });

  it('정상 저장 확인', async () => {
    await logFood('c1', 'u1', 'lunch', '비빔밥');
    const db = getMockDb();
    const docs = [...db.entries()].filter(([k]) => k.startsWith('foodLogs/'));
    expect(docs).toHaveLength(1);
    expect(docs[0]![1].name).toBe('비빔밥');
    expect(docs[0]![1].mealType).toBe('lunch');
    expect(docs[0]![1].date).toBe('2026-06-10');
  });

  it('[BR-DF5] deleteFood 호출 후 문서 삭제', async () => {
    await logFood('c1', 'u1', 'dinner', '삼겹살');
    const db = getMockDb();
    const docs = [...db.entries()].filter(([k]) => k.startsWith('foodLogs/'));
    const id   = docs[0]![0].split('/')[1]!;
    await deleteFood(id);
    const afterDb = getMockDb();
    expect([...afterDb.entries()].filter(([k]) => k.startsWith('foodLogs/'))).toHaveLength(0);
  });
});
