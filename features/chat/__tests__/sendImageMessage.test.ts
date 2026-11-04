import { resetMockDb } from '../../../__mocks__/firebase';

// ADR-032: 채팅 이미지는 core/photos 로 인코딩해 Firestore photoData 에 저장하고 참조를 imageUrl 에 둔다.
const mockEncodeJpeg    = jest.fn();
const mockSavePhotoData = jest.fn();
const mockUploadBytes   = jest.fn();

jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('firebase/storage', () => ({
  ref:            jest.fn(),
  uploadBytes:    (...args: unknown[]) => mockUploadBytes(...args),
  getDownloadURL: jest.fn(),
}));
jest.mock('../../../core/config/firebase', () => ({ db: {} }));
jest.mock('../../../core/photos', () => ({
  encodeJpeg:    (...args: unknown[]) => mockEncodeJpeg(...args),
  savePhotoData: (...args: unknown[]) => mockSavePhotoData(...args),
}));

import { sendImageMessage } from '../index';

const ENCODED = { base64: 'QUJD', width: 1080, height: 810 };

beforeEach(() => {
  resetMockDb();
  jest.clearAllMocks();
  mockEncodeJpeg.mockResolvedValue(ENCODED);
  mockSavePhotoData.mockResolvedValue('fsphoto:couple1/img1');
});

describe('sendImageMessage', () => {
  it('[BR-6] 긴 변 1080px, 품질 0.7 JPEG 로 인코딩', async () => {
    await sendImageMessage('couple1', 'u1', 'file://original.jpg');
    expect(mockEncodeJpeg).toHaveBeenCalledWith('file://original.jpg', { maxSide: 1080, quality: 0.7 });
  });

  it('[ADR-032] 인코딩한 이미지를 보낸 사람 uid 로 커플 photoData 에 저장', async () => {
    await sendImageMessage('couple1', 'u1', 'file://img.jpg');
    expect(mockSavePhotoData).toHaveBeenCalledWith('couple1', 'u1', ENCODED);
  });

  it('[회귀] firebase uploadBytes 를 쓰지 않는다 — RN 에서 ArrayBuffer Blob 생성 오류로 실패', async () => {
    await sendImageMessage('couple1', 'u1', 'file://img.jpg');
    expect(mockUploadBytes).not.toHaveBeenCalled();
  });

  it('[BR-6] Firestore 메시지 문서에 imageUrl(참조) + senderId 저장', async () => {
    await sendImageMessage('couple1', 'u1', 'file://img.jpg');
    const db = require('../../../__mocks__/firebase').getMockDb() as Map<string, Record<string, unknown>>;
    const msgDoc = [...db.values()].find(d => d['imageUrl'] !== undefined);
    expect(msgDoc?.['imageUrl']).toBe('fsphoto:couple1/img1');
    expect(msgDoc?.['senderId']).toBe('u1');
    expect(msgDoc?.['text']).toBe('');
  });
});
