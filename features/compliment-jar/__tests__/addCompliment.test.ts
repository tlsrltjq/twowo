import { resetMockDb, getMockDb } from '../../../__mocks__/firebase';

jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('../../../core/config/firebase', () => ({ db: {} }));

import { addCompliment } from '../index';

beforeEach(() => resetMockDb());

describe('addCompliment', () => {
  it('[BR-CJ1] 151자 reject', async () => {
    await expect(
      addCompliment('c1', 'u1', 'u2', 'a'.repeat(151)),
    ).rejects.toThrow('1~150자');
  });

  it('[BR-CJ1] 공백만 reject', async () => {
    await expect(
      addCompliment('c1', 'u1', 'u2', '   '),
    ).rejects.toThrow('1~150자');
  });

  it('[BR-CJ2] addDoc 방식으로 저장 (삭제/수정 API 없음)', async () => {
    await addCompliment('c1', 'u1', 'u2', '고마워!');
    const db = getMockDb();
    const docs = [...db.entries()].filter(([k]) => k.startsWith('compliments/'));
    expect(docs).toHaveLength(1);
    expect(docs[0]![1].text).toBe('고마워!');
  });

  it('[BR-CJ3] toUid 필드가 상대방 uid로 저장', async () => {
    await addCompliment('c1', 'fromUser', 'toUser', '오늘도 수고했어');
    const db = getMockDb();
    const docs = [...db.entries()].filter(([k]) => k.startsWith('compliments/'));
    expect(docs[0]![1].fromUid).toBe('fromUser');
    expect(docs[0]![1].toUid).toBe('toUser');
  });

  it('정상 저장 시 coupleId 포함', async () => {
    await addCompliment('couple1', 'u1', 'u2', '사랑해');
    const db = getMockDb();
    const docs = [...db.entries()].filter(([k]) => k.startsWith('compliments/'));
    expect(docs[0]![1].coupleId).toBe('couple1');
  });
});
