import { getMockDb, resetMockDb } from '../../../__mocks__/firebase';
import { sendMessage } from '../index';

jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('firebase/storage', () => ({ ref: jest.fn(), uploadBytes: jest.fn(), getDownloadURL: jest.fn() }));
jest.mock('expo-image-manipulator', () => ({ manipulateAsync: jest.fn(), SaveFormat: { JPEG: 'jpeg' } }));
jest.mock('../../../core/config/firebase', () => ({ db: {}, storage: {} }));

beforeEach(() => resetMockDb());

describe('sendMessage', () => {
  it('[BR-3] 1001자 텍스트 전송 시 reject', async () => {
    await expect(sendMessage('c1', 'u1', 'a'.repeat(1001))).rejects.toThrow('1000자');
  });

  it('[BR-3] 1000자 텍스트는 허용', async () => {
    await expect(sendMessage('c1', 'u1', 'a'.repeat(1000))).resolves.not.toThrow();
  });

  it('text.trim() 적용 후 저장', async () => {
    await sendMessage('c1', 'u1', '  앞뒤 공백  ');
    const db = getMockDb();
    const docs = [...db.entries()].filter(([path]) => path.startsWith('couples/'));
    expect(docs).toHaveLength(1);
    expect(docs[0]![1].text).toBe('앞뒤 공백');
  });

  it('senderId 필드 정확히 저장', async () => {
    await sendMessage('c1', 'uid-alice', '안녕');
    const db = getMockDb();
    const doc = [...db.values()].find(d => d.text === '안녕');
    expect(doc?.senderId).toBe('uid-alice');
  });
});
