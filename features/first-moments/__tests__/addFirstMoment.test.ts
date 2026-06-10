import { resetMockDb, getMockDb } from '../../../__mocks__/firebase';

jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('../../../core/config/firebase', () => ({ db: {} }));
jest.mock('../../../core/utils/date', () => ({ getTodayKST: () => '2026-06-10' }));

import { addFirstMoment, deleteFirstMoment } from '../index';

beforeEach(() => resetMockDb());

describe('addFirstMoment', () => {
  it('[BR-FM1] 61자 reject', async () => {
    await expect(
      addFirstMoment('c1', 'u1', 'a'.repeat(61), '2026-06-01'),
    ).rejects.toThrow('1~60자');
  });

  it('[BR-FM1] 공백만 reject', async () => {
    await expect(
      addFirstMoment('c1', 'u1', '   ', '2026-06-01'),
    ).rejects.toThrow('1~60자');
  });

  it('[BR-FM2] 미래 날짜 reject', async () => {
    await expect(
      addFirstMoment('c1', 'u1', '처음 여행', '2026-06-11'),
    ).rejects.toThrow('과거 날짜');
  });

  it('[BR-FM2] 오늘 날짜는 허용', async () => {
    await expect(
      addFirstMoment('c1', 'u1', '처음 한 일', '2026-06-10'),
    ).resolves.toBeUndefined();
  });

  it('[BR-FM3] 메모 있는 경우 저장 확인', async () => {
    await addFirstMoment('c1', 'u1', '첫 여행', '2026-03-01', '제주도였어');
    const db = getMockDb();
    const docs = [...db.entries()].filter(([k]) => k.startsWith('firstMoments/'));
    expect(docs[0]![1].memo).toBe('제주도였어');
  });

  it('[BR-FM3] 메모 없으면 저장 안 됨', async () => {
    await addFirstMoment('c1', 'u1', '첫 밥', '2026-01-10');
    const db = getMockDb();
    const docs = [...db.entries()].filter(([k]) => k.startsWith('firstMoments/'));
    expect(docs[0]![1].memo).toBeUndefined();
  });

  it('[BR-FM5] deleteFirstMoment 호출 후 삭제', async () => {
    await addFirstMoment('c1', 'u1', '첫 데이트', '2026-02-14');
    const db = getMockDb();
    const docs = [...db.entries()].filter(([k]) => k.startsWith('firstMoments/'));
    const id   = docs[0]![0].split('/')[1]!;
    await deleteFirstMoment(id);
    const afterDb = getMockDb();
    expect([...afterDb.entries()].filter(([k]) => k.startsWith('firstMoments/'))).toHaveLength(0);
  });
});
