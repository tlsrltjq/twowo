import { resetMockDb, seedMockDb } from '../../../__mocks__/firebase';
import { subscribeMessages } from '../index';

const mockFirestore = require('../../../__mocks__/firebase');

jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('firebase/storage', () => ({ ref: jest.fn(), uploadBytes: jest.fn(), getDownloadURL: jest.fn() }));
jest.mock('expo-image-manipulator', () => ({ manipulateAsync: jest.fn(), SaveFormat: { JPEG: 'jpeg' } }));
jest.mock('../../../core/config/firebase', () => ({ db: {}, storage: {} }));

beforeEach(() => {
  resetMockDb();
  jest.clearAllMocks();
});

describe('subscribeMessages', () => {
  it('[BR-1] couples/{coupleId}/messages 서브컬렉션 구독', () => {
    const collectionSpy = jest.spyOn(mockFirestore, 'collection');
    subscribeMessages('couple-abc', jest.fn());
    expect(collectionSpy).toHaveBeenCalledWith(
      expect.anything(), 'couples', 'couple-abc', 'messages',
    );
  });

  it('[BR-5] orderBy("createdAt", "desc") 쿼리 생성', () => {
    const orderBySpy = jest.spyOn(mockFirestore, 'orderBy');
    subscribeMessages('couple-abc', jest.fn());
    expect(orderBySpy).toHaveBeenCalledWith('createdAt', 'desc');
  });

  it('[BR-5] limit(50) 쿼리 생성', () => {
    const limitSpy = jest.spyOn(mockFirestore, 'limit');
    subscribeMessages('couple-abc', jest.fn());
    expect(limitSpy).toHaveBeenCalledWith(50);
  });

  it('[BR-1] 메시지 콜백 호출 시 id·senderId·text·createdAt 포함', () => {
    seedMockDb('couples/msg1', {
      senderId: 'u1',
      text: '안녕',
      createdAt: { toDate: () => new Date('2024-06-15T10:00:00') },
    });

    const received: any[] = [];
    subscribeMessages('couple-abc', msgs => received.push(...msgs));

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ senderId: 'u1', text: '안녕' });
    expect(received[0].id).toBeDefined();
  });

  it('imageUrl 필드 있으면 포함, 없으면 생략', () => {
    seedMockDb('couples/m1', { senderId: 'u1', text: '', imageUrl: 'https://img.url', createdAt: { toDate: () => new Date() } });
    seedMockDb('couples/m2', { senderId: 'u2', text: '텍스트', createdAt: { toDate: () => new Date() } });

    const received: any[] = [];
    subscribeMessages('couple-abc', msgs => received.push(...msgs));

    const withImg  = received.find(m => m.senderId === 'u1');
    const withText = received.find(m => m.senderId === 'u2');
    expect(withImg?.imageUrl).toBe('https://img.url');
    expect(withText?.imageUrl).toBeUndefined();
  });
});
