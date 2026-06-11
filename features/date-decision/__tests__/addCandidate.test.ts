import { getMockDb, resetMockDb, seedMockDb } from '../../../__mocks__/firebase';
import { addCandidate, removeCandidate } from '../index';

jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('../../../core/config/firebase', () => ({ db: {} }));

beforeEach(() => resetMockDb());

describe('[BR-DD1] addCandidate', () => {
  test('유효한 후보를 Firestore에 추가한다', async () => {
    await addCandidate('couple1', 'user1', '홍대 카페 투어', 'activity');
    const db = getMockDb();
    const entries = [...db.entries()].filter(([k]) => k.startsWith('dateCandidates/'));
    expect(entries).toHaveLength(1);
    expect(entries[0]![1].title).toBe('홍대 카페 투어');
    expect(entries[0]![1].category).toBe('activity');
    expect(entries[0]![1].createdBy).toBe('user1');
    expect(entries[0]![1].coupleId).toBe('couple1');
  });

  test('title 앞뒤 공백을 trim하여 저장한다', async () => {
    await addCandidate('couple1', 'user1', '  홍대  ', 'food');
    const db = getMockDb();
    const entries = [...db.entries()].filter(([k]) => k.startsWith('dateCandidates/'));
    expect(entries[0]![1].title).toBe('홍대');
  });
});

describe('[BR-DD2] removeCandidate', () => {
  test('후보를 Firestore에서 삭제한다', async () => {
    seedMockDb('dateCandidates/cand1', { coupleId: 'couple1', title: '영화' });
    await removeCandidate('cand1');
    expect(getMockDb().has('dateCandidates/cand1')).toBe(false);
  });
});
