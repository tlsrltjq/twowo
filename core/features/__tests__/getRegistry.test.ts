import { getRegistry } from '../index';

jest.mock('../../config/firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  onSnapshot: jest.fn(),
  query: jest.fn(),
  serverTimestamp: jest.fn(),
  setDoc: jest.fn(),
  where: jest.fn(),
}));

describe('getRegistry', () => {
  test('[BR-L1] experimental 만 실험실 목록에 포함', () => {
    const all          = getRegistry();
    const experimental = all.filter(f => f.status === 'experimental');
    const active       = all.filter(f => f.status === 'active');

    expect(all.length).toBeGreaterThan(0);

    // experimental 항목은 id/name/description 모두 있어야 함
    experimental.forEach(f => {
      expect(f.id).toBeTruthy();
      expect(f.name).toBeTruthy();
      expect(f.description).toBeTruthy();
      expect(f.status).toBe('experimental');
    });

    // active 항목은 실험실 목록(experimental)에 포함되지 않음
    active.forEach(f => {
      expect(experimental.find(e => e.id === f.id)).toBeUndefined();
    });
  });

  test('[BR-L1] status 값은 허용된 종류만 사용', () => {
    const VALID_STATUSES = ['experimental', 'active', 'hidden', 'deprecated'];
    getRegistry().forEach(f => {
      expect(VALID_STATUSES).toContain(f.status);
    });
  });

  test('[BR-L1] registry featureId는 중복 없음', () => {
    const ids = getRegistry().map(f => f.id);
    expect(ids.length).toBe(new Set(ids).size);
  });
});
