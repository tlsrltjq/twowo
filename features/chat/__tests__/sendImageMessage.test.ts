import { resetMockDb } from '../../../__mocks__/firebase';

const mockManipulate    = jest.fn();
const mockUploadBytes   = jest.fn();
const mockGetDownloadURL = jest.fn();
const mockStorageRef    = jest.fn();

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: (uri: string, ops: unknown, opts: unknown) => mockManipulate(uri, ops, opts),
  SaveFormat: { JPEG: 'jpeg' },
}));
jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('firebase/storage', () => ({
  ref:            (s: unknown, path: string) => mockStorageRef(s, path),
  uploadBytes:    (r: unknown, b: unknown, m: unknown) => mockUploadBytes(r, b, m),
  getDownloadURL: (r: unknown) => mockGetDownloadURL(r),
}));
jest.mock('../../../core/config/firebase', () => ({ db: {}, storage: {} }));

global.fetch = jest.fn(async () => ({ blob: jest.fn(async () => new Blob()) })) as unknown as typeof fetch;

import { sendImageMessage } from '../index';

beforeEach(() => {
  resetMockDb();
  jest.clearAllMocks();
  mockManipulate.mockResolvedValue({ uri: 'file://compressed.jpg', width: 800, height: 600 });
  mockUploadBytes.mockResolvedValue({});
  mockGetDownloadURL.mockResolvedValue('https://storage.example.com/img.jpg');
  mockStorageRef.mockReturnValue({ _path: 'mock-path' });
});

describe('sendImageMessage', () => {
  it('[BR-6] manipulateAsync — width:1080, quality:0.75, JPEG 포맷', async () => {
    await sendImageMessage('couple1', 'u1', 'file://original.jpg');
    expect(mockManipulate).toHaveBeenCalledWith(
      'file://original.jpg',
      [{ resize: { width: 1080 } }],
      { compress: 0.75, format: 'jpeg' },
    );
  });

  it('[BR-6] Storage 경로 — couples/{coupleId}/chat/{messageId}.jpg', async () => {
    await sendImageMessage('couple1', 'u1', 'file://img.jpg');
    const path: string = mockStorageRef.mock.calls[0]?.[1] as string;
    expect(path).toMatch(/^couples\/couple1\/chat\/.+\.jpg$/);
  });

  it('[BR-6] Firestore 메시지 문서에 imageUrl + senderId 저장', async () => {
    await sendImageMessage('couple1', 'u1', 'file://img.jpg');
    const db = require('../../../__mocks__/firebase').getMockDb() as Map<string, Record<string, unknown>>;
    const msgDoc = [...db.values()].find(d => d['imageUrl'] !== undefined);
    expect(msgDoc?.['imageUrl']).toBe('https://storage.example.com/img.jpg');
    expect(msgDoc?.['senderId']).toBe('u1');
    expect(msgDoc?.['text']).toBe('');
  });
});
