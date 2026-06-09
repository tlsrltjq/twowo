jest.mock('firebase/firestore', () => require('../../../__mocks__/firebase'));
jest.mock('firebase/storage', () => ({
  getDownloadURL: jest.fn(),
  ref:            jest.fn(),
  uploadBytes:    jest.fn(),
}));
jest.mock('expo-file-system', () => ({ readAsStringAsync: jest.fn(), EncodingType: { Base64: 'base64' } }));
jest.mock('expo-image-manipulator', () => ({ manipulateAsync: jest.fn(), SaveFormat: { JPEG: 'jpeg' } }));
jest.mock('../../config/firebase', () => ({ db: {}, storage: {} }));

import { guardPhotoLimit } from '../upload';

describe('guardPhotoLimit', () => {
  test('[BR-5] 19장은 허용', () => {
    expect(() => guardPhotoLimit(19)).not.toThrow();
  });

  test('[BR-5] 20장(한도)은 거부', () => {
    expect(() => guardPhotoLimit(20)).toThrow('photoIds limit exceeded (max 20)');
  });

  test('[BR-5] 21장도 거부', () => {
    expect(() => guardPhotoLimit(21)).toThrow();
  });
});

// BR-6: 압축/EXIF 제거 결과는 expo-image-manipulator를 실제 실행해야 검증 가능.
// 에뮬레이터/실기기 환경에서 통합 테스트로 커버 (photo-upload-order.test.ts).
describe('upload BR-6 — 통합 테스트 위임', () => {
  test.skip('[BR-6] 1440px / quality 0.75 결과 검증 — 통합 테스트에서 커버', () => {});
});
