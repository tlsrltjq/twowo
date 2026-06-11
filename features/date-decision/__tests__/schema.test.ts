import { getMockDb, resetMockDb, seedMockDb } from '../../../__mocks__/firebase';
import { castVote, startNewRound } from '../index';

jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('../../../core/config/firebase', () => ({ db: {} }));

beforeEach(() => resetMockDb());

describe('VoteSession 스키마 유효성', () => {
  test('[BR-2] choices는 { [uid]: candidateId } 구조로 저장된다', async () => {
    const sessionId = await startNewRound('couple1');
    seedMockDb(`voteSessions/${sessionId}`, {
      coupleId: 'couple1', status: 'in_progress', choices: {},
    });
    await castVote(sessionId, 'user1', 'cand-abc', ['user1', 'user2']);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const choices = getMockDb().get(`voteSessions/${sessionId}`)!.choices;
    expect(typeof choices).toBe('object');
    expect(choices['user1']).toBe('cand-abc');
  });

  test('[BR-3] startNewRound이 생성하는 세션의 초기 choices는 빈 객체이다', async () => {
    const id = await startNewRound('couple1');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const session = getMockDb().get(`voteSessions/${id}`)!;
    expect(session.choices).toEqual({});
    expect(session.status).toBe('in_progress');
    expect(session.coupleId).toBe('couple1');
  });
});
