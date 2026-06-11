import { getMockDb, resetMockDb, seedMockDb } from '../../../__mocks__/firebase';
import { removeCandidate } from '../index';

jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('../../../core/config/firebase', () => ({ db: {} }));

beforeEach(() => resetMockDb());

describe('[BR-8] removeCandidate', () => {
  test('[BR-8] 후보 삭제 시 dateCandidates에서 제거된다', async () => {
    seedMockDb('dateCandidates/cand1', { coupleId: 'couple1', title: '한강 피크닉' });
    await removeCandidate('cand1');
    expect(getMockDb().has('dateCandidates/cand1')).toBe(false);
  });

  test('[BR-8] 다른 후보는 그대로 유지된다', async () => {
    seedMockDb('dateCandidates/cand1', { coupleId: 'couple1', title: '한강' });
    seedMockDb('dateCandidates/cand2', { coupleId: 'couple1', title: '홍대' });
    await removeCandidate('cand1');
    expect(getMockDb().has('dateCandidates/cand2')).toBe(true);
  });
});
