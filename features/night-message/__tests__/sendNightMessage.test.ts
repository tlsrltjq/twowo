import { getMockDb,resetMockDb } from '../../../__mocks__/firebase';
import { sendNightMessage } from '../index';

jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('../../../core/config/firebase', () => ({ db: {} }));
jest.mock('../../../core/utils/date', () => ({ getTodayKST: () => '2026-06-10' }));

beforeEach(() => resetMockDb());

describe('sendNightMessage', () => {
  it('[BR-NM1] 같은 날 같은 type 재전송 시 덮어쓰기', async () => {
    await sendNightMessage('couple1', 'user1', 'night', '잘자');
    await sendNightMessage('couple1', 'user1', 'night', '수정된 메시지');
    const db = getMockDb();
    const doc = db.get('nightMessages/couple1_user1_2026-06-10_night');
    expect(doc?.text).toBe('수정된 메시지');
  });

  it('[BR-NM2] 101자 전송 시 reject', async () => {
    const longText = 'a'.repeat(101);
    await expect(sendNightMessage('couple1', 'user1', 'night', longText)).rejects.toThrow('1~100자');
  });

  it('[BR-NM2] 공백만 입력 시 reject', async () => {
    await expect(sendNightMessage('couple1', 'user1', 'morning', '   ')).rejects.toThrow('1~100자');
  });

  it('[BR-NM5] 수정(upsert) 후 text 갱신 확인', async () => {
    await sendNightMessage('couple1', 'user1', 'morning', '좋은 아침');
    await sendNightMessage('couple1', 'user1', 'morning', '일어났어?');
    const db = getMockDb();
    const doc = db.get('nightMessages/couple1_user1_2026-06-10_morning');
    expect(doc?.text).toBe('일어났어?');
    expect(doc?.type).toBe('morning');
  });

  it('정상 저장 시 docId 구조 확인', async () => {
    await sendNightMessage('c1', 'u1', 'night', '안녕');
    const db = getMockDb();
    expect(db.has('nightMessages/c1_u1_2026-06-10_night')).toBe(true);
  });
});
