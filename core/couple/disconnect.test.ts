/**
 * [BR-D1] disconnectCouple — status:'disconnected' + 메타 필드 기록
 * [BR-D4] reconnectCouple — status:'active' + 메타 필드 제거
 */

const mockUpdateDoc = jest.fn();
const mockDoc       = jest.fn((_, col, id) => ({ col, id }));
const mockServerTs  = jest.fn(() => 'SERVER_TIMESTAMP');

jest.mock('firebase/firestore', () => ({
  updateDoc:       (...a: unknown[]) => mockUpdateDoc(...a),
  doc:             (...a: unknown[]) => mockDoc(...a),
  serverTimestamp: () => mockServerTs(),
}));
jest.mock('../config/firebase', () => ({ db: {} }));

import { disconnectCouple, reconnectCouple } from './disconnect';

describe('[BR-D1] disconnectCouple', () => {
  beforeEach(() => jest.clearAllMocks());

  it('couples/{coupleId} 에 status:disconnected + disconnectedBy/At 기록', async () => {
    mockUpdateDoc.mockResolvedValue(undefined);
    await disconnectCouple('uid-alice', 'couple-abc');

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [ref, data] = mockUpdateDoc.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(ref).toEqual({ col: 'couples', id: 'couple-abc' });
    expect(data.status).toBe('disconnected');
    expect(data.disconnectedBy).toBe('uid-alice');
    expect(data.disconnectedAt).toBe('SERVER_TIMESTAMP');
  });

  it('Firestore 에러 시 throw 전파', async () => {
    mockUpdateDoc.mockRejectedValue(new Error('firestore error'));
    await expect(disconnectCouple('uid-alice', 'couple-abc')).rejects.toThrow('firestore error');
  });
});

describe('[BR-D4] reconnectCouple', () => {
  beforeEach(() => jest.clearAllMocks());

  it('status:active + disconnectedAt/By null 로 초기화', async () => {
    mockUpdateDoc.mockResolvedValue(undefined);
    await reconnectCouple('couple-abc');

    const [, data] = mockUpdateDoc.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data.status).toBe('active');
    expect(data.disconnectedAt).toBeNull();
    expect(data.disconnectedBy).toBeNull();
  });
});
