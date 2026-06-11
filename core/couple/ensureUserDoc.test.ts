import { ensureUserDoc } from './index';
jest.mock('firebase/firestore', () => require('../../__mocks__/firebase'));
jest.mock('../config/firebase', () => ({ db: {} }));

const { resetMockDb, seedMockDb, getMockDb } = require('../../__mocks__/firebase');

describe('ensureUserDoc', () => {
  beforeEach(() => resetMockDb());

  it('[BR-1] 로그인 직후 users 문서 자동 생성, coupleId=null', async () => {
    await ensureUserDoc('uid1', '테스트유저');
    const db = getMockDb();
    const user = db.get('users/uid1')!;
    expect(user.coupleId).toBeNull();
    expect(user.id).toBe('uid1');
    expect(user.displayName).toBe('테스트유저');
  });

  it('[BR-1] 이미 coupleId가 있는 경우 덮어쓰지 않음', async () => {
    seedMockDb('users/uid1', { id: 'uid1', displayName: '기존유저', coupleId: 'couple123' });
    await ensureUserDoc('uid1', '기존유저');
    const db = getMockDb();
    expect(db.get('users/uid1')!.coupleId).toBe('couple123');
  });

  it('[BR-1] 동일 uid 재호출 시 displayName 업데이트', async () => {
    await ensureUserDoc('uid2', '첫이름');
    await ensureUserDoc('uid2', '바뀐이름');
    const db = getMockDb();
    expect(db.get('users/uid2')!.displayName).toBe('바뀐이름');
  });
});
