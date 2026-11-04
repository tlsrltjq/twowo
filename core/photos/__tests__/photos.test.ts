/**
 * ADR-032: 사진을 Firestore 에 base64 로 저장하는 core/photos 단위 테스트.
 */
import { getMockDb, resetMockDb, seedMockDb } from '../../../__mocks__/firebase';

const mockManipulate = jest.fn();
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: (...args: unknown[]) => mockManipulate(...args),
  SaveFormat: { JPEG: 'jpeg' },
}));
jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('../../config/firebase', () => ({ db: {} }));

import {
  deletePhotoData,
  encodeJpeg,
  isPhotoRef,
  MAX_BASE64_CHARS,
  resolvePhotoUri,
  savePhotoData,
  toDataUrl,
} from '../index';

const b64 = (n: number) => 'A'.repeat(n);

beforeEach(() => {
  resetMockDb();
  mockManipulate.mockReset();
});

describe('encodeJpeg', () => {
  it('긴 변을 maxSide 로 줄이고 base64 JPEG 로 인코딩한다', async () => {
    mockManipulate.mockResolvedValue({ base64: b64(1000), width: 1280, height: 960 });
    const out = await encodeJpeg('file://a.jpg', { maxSide: 1280, quality: 0.7, width: 4000, height: 3000 });
    expect(mockManipulate).toHaveBeenCalledWith(
      'file://a.jpg',
      [{ resize: { width: 1280 } }],
      { compress: 0.7, format: 'jpeg', base64: true },
    );
    expect(out).toEqual({ base64: b64(1000), width: 1280, height: 960 });
  });

  it('세로 사진은 높이를 기준으로 줄인다', async () => {
    mockManipulate.mockResolvedValue({ base64: b64(10), width: 960, height: 1280 });
    await encodeJpeg('file://a.jpg', { maxSide: 1280, quality: 0.7, width: 3000, height: 4000 });
    expect(mockManipulate.mock.calls[0]![1]).toEqual([{ resize: { height: 1280 } }]);
  });

  it('원본이 더 작으면 키우지 않는다', async () => {
    mockManipulate.mockResolvedValue({ base64: b64(10), width: 300, height: 200 });
    await encodeJpeg('file://a.jpg', { maxSide: 1280, quality: 0.7, width: 300, height: 200 });
    expect(mockManipulate.mock.calls[0]![1]).toEqual([]);
  });

  it('상한을 넘으면 품질과 크기를 낮춰 다시 인코딩한다', async () => {
    mockManipulate
      .mockResolvedValueOnce({ base64: b64(MAX_BASE64_CHARS + 1), width: 1280, height: 960 })
      .mockResolvedValueOnce({ base64: b64(500), width: 1280, height: 960 });
    const out = await encodeJpeg('file://a.jpg', { maxSide: 1280, quality: 0.7, width: 4000, height: 3000 });
    expect(mockManipulate).toHaveBeenCalledTimes(2);
    const secondOpts = mockManipulate.mock.calls[1]![2] as { compress: number };
    expect(secondOpts.compress).toBeLessThan(0.7);
    expect(out.base64).toHaveLength(500);
  });

  it('끝까지 줄여도 상한을 넘으면 오류', async () => {
    mockManipulate.mockResolvedValue({ base64: b64(MAX_BASE64_CHARS + 1), width: 1, height: 1 });
    await expect(encodeJpeg('file://a.jpg', { maxSide: 1280, quality: 0.7 })).rejects.toThrow('too large');
  });
});

describe('savePhotoData / resolvePhotoUri / deletePhotoData', () => {
  it('couples/{coupleId}/photoData 에 저장하고 fsphoto 참조를 돌려준다', async () => {
    const ref = await savePhotoData('c1', 'u1', { base64: 'QUJD', width: 10, height: 20 });
    expect(isPhotoRef(ref)).toBe(true);
    expect(ref).toMatch(/^fsphoto:c1\//);
    const id = ref.split('/').pop()!;
    const saved = getMockDb().get(`couples/c1/photoData/${id}`)!;
    expect(saved).toMatchObject({ data: 'QUJD', width: 10, height: 20, createdBy: 'u1' });
  });

  it('참조를 data URL 로 풀어 준다', async () => {
    seedMockDb('couples/c1/photoData/p1', { data: 'QUJD' });
    await expect(resolvePhotoUri('fsphoto:c1/p1')).resolves.toBe('data:image/jpeg;base64,QUJD');
  });

  it('data URL·http URL 은 그대로 돌려준다', async () => {
    await expect(resolvePhotoUri(toDataUrl('QUJD'))).resolves.toBe('data:image/jpeg;base64,QUJD');
    await expect(resolvePhotoUri('https://example.com/a.jpg')).resolves.toBe('https://example.com/a.jpg');
    await expect(resolvePhotoUri(null)).resolves.toBeNull();
  });

  it('없는 참조는 null', async () => {
    await expect(resolvePhotoUri('fsphoto:c1/missing')).resolves.toBeNull();
  });

  it('참조 문서를 지운다 (참조가 아니면 아무것도 하지 않음)', async () => {
    seedMockDb('couples/c1/photoData/p2', { data: 'QUJD' });
    await deletePhotoData('fsphoto:c1/p2');
    expect(getMockDb().has('couples/c1/photoData/p2')).toBe(false);
    await expect(deletePhotoData('https://example.com/a.jpg')).resolves.toBeUndefined();
  });
});
