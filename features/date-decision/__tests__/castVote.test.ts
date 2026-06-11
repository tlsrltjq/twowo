import { getMockDb, resetMockDb, seedMockDb } from '../../../__mocks__/firebase';
import { castVote, startNewRound } from '../index';

jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('../../../core/config/firebase', () => ({ db: {} }));

beforeEach(() => resetMockDb());

describe('[BR-DD3] startNewRound', () => {
  test('새 in_progress 세션을 생성하고 ID를 반환한다', async () => {
    const id = await startNewRound('couple1');
    expect(typeof id).toBe('string');
    expect(id).toBeTruthy();
    const db = getMockDb();
    const sessions = [...db.entries()].filter(([k]) => k.startsWith('voteSessions/'));
    expect(sessions).toHaveLength(1);
    expect(sessions[0]![1].status).toBe('in_progress');
    expect(sessions[0]![1].coupleId).toBe('couple1');
  });
});

describe('[BR-DD4/5] castVote', () => {
  test('한 명만 투표하면 in_progress 유지', async () => {
    seedMockDb('voteSessions/session1', {
      coupleId: 'couple1',
      status: 'in_progress',
      choices: {},
    });
    await castVote('session1', 'user1', 'cand1', ['user1', 'user2']);
    const db = getMockDb();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const session = db.get('voteSessions/session1')!;
    expect(session.status).toBe('in_progress');
    expect(session.choices['user1']).toBe('cand1');
  });

  test('양쪽 투표 완료 시 status가 revealed로 전이한다', async () => {
    seedMockDb('voteSessions/session1', {
      coupleId: 'couple1',
      status: 'in_progress',
      choices: { user1: 'cand1' },
    });
    await castVote('session1', 'user2', 'cand2', ['user1', 'user2']);
    const db = getMockDb();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(db.get('voteSessions/session1')!.status).toBe('revealed');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(db.get('voteSessions/session1')!.choices['user2']).toBe('cand2');
  });

  test('존재하지 않는 세션은 에러', async () => {
    await expect(castVote('none', 'user1', 'cand1', ['user1'])).rejects.toThrow('session not found');
  });
});
