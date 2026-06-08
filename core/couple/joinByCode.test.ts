jest.mock('firebase/firestore', () => require('../../__mocks__/firebase'));
jest.mock('../config/firebase', () => ({ db: {} }));

const { resetMockDb, seedMockDb, getMockDb } = require('../../__mocks__/firebase');
import { joinByCode } from './index';
import { JoinError } from './types';

const FUTURE = { toMillis: () => Date.now() + 86_400_000 };
const PAST   = { toMillis: () => Date.now() - 1_000 };

function seedValidScenario(code = 'VALID1', joinerUid = 'uid-b') {
  seedMockDb('invitations/' + code, { coupleId: 'couple1', createdBy: 'uid-a', expiresAt: FUTURE });
  seedMockDb('couples/couple1', { id: 'couple1', memberIds: ['uid-a'], status: 'active' });
  seedMockDb('users/' + joinerUid, { id: joinerUid, displayName: 'B', coupleId: null });
}

describe('joinByCode', () => {
  beforeEach(() => resetMockDb());

  it('정상 join — couples.memberIds에 추가 + users.coupleId 설정 + 초대 코드 삭제', async () => {
    seedValidScenario();
    const { coupleId } = await joinByCode('uid-b', 'VALID1');
    expect(coupleId).toBe('couple1');
    const db = getMockDb();
    expect(db.get('couples/couple1')!.memberIds).toContain('uid-b');
    expect(db.get('users/uid-b')!.coupleId).toBe('couple1');
    expect(db.has('invitations/VALID1')).toBe(false);
  });

  it('[BR-4] 24h 지난 코드 입력 → JoinError(expired)', async () => {
    seedMockDb('invitations/EXPIRED', { coupleId: 'couple1', createdBy: 'uid-a', expiresAt: PAST });
    seedMockDb('couples/couple1', { id: 'couple1', memberIds: ['uid-a'], status: 'active' });
    seedMockDb('users/uid-b', { id: 'uid-b', displayName: 'B', coupleId: null });

    await expect(joinByCode('uid-b', 'EXPIRED')).rejects.toMatchObject({ reason: 'expired' });
  });

  it('[BR-4] 존재하지 않는 코드 → JoinError(not_found)', async () => {
    seedMockDb('users/uid-b', { id: 'uid-b', displayName: 'B', coupleId: null });
    await expect(joinByCode('uid-b', 'XXXXXX')).rejects.toMatchObject({ reason: 'not_found' });
  });

  it('[BR-6] 본인이 만든 코드 본인 입력 시 JoinError(self)', async () => {
    seedMockDb('invitations/MYCODE', { coupleId: 'couple1', createdBy: 'uid-a', expiresAt: FUTURE });
    seedMockDb('couples/couple1', { id: 'couple1', memberIds: ['uid-a'], status: 'active' });
    seedMockDb('users/uid-a', { id: 'uid-a', displayName: 'A', coupleId: null });

    await expect(joinByCode('uid-a', 'MYCODE')).rejects.toMatchObject({ reason: 'self' });
  });

  it('[BR-7] 이미 coupleId 있는 사용자 거부 → JoinError(already_joined)', async () => {
    seedMockDb('invitations/VALID2', { coupleId: 'couple1', createdBy: 'uid-a', expiresAt: FUTURE });
    seedMockDb('couples/couple1', { id: 'couple1', memberIds: ['uid-a'], status: 'active' });
    seedMockDb('users/uid-b', { id: 'uid-b', displayName: 'B', coupleId: 'existing-couple' });

    await expect(joinByCode('uid-b', 'VALID2')).rejects.toMatchObject({ reason: 'already_joined' });
  });

  it('[BR-8] memberIds.size==2 시 JoinError(couple_full)', async () => {
    seedMockDb('invitations/FULL1', { coupleId: 'couple2', createdBy: 'uid-a', expiresAt: FUTURE });
    seedMockDb('couples/couple2', { id: 'couple2', memberIds: ['uid-a', 'uid-c'], status: 'active' });
    seedMockDb('users/uid-b', { id: 'uid-b', displayName: 'B', coupleId: null });

    await expect(joinByCode('uid-b', 'FULL1')).rejects.toMatchObject({ reason: 'couple_full' });
  });

  it('JoinError는 Error를 상속한다', async () => {
    seedMockDb('users/uid-b', { id: 'uid-b', displayName: 'B', coupleId: null });
    const err = await joinByCode('uid-b', 'XXXXXX').catch(e => e);
    expect(err).toBeInstanceOf(JoinError);
    expect(err).toBeInstanceOf(Error);
  });
});
