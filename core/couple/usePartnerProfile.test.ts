import { resolvePartnerName } from './usePartnerProfile';
jest.mock('firebase/firestore', () => require('../../__mocks__/firebase'));
jest.mock('../config/firebase', () => ({ db: {} }));

describe('resolvePartnerName', () => {
  it('displayName 이 있으면 그대로 쓴다', () => {
    expect(resolvePartnerName('지민')).toBe('지민');
  });

  it('displayName 이 없으면 "상대방"', () => {
    expect(resolvePartnerName(undefined)).toBe('상대방');
  });

  it('[회귀] displayName 이 빈 문자열이면 "상대방" — "의 메시지" 처럼 이름이 빠져 보이던 문제', () => {
    expect(resolvePartnerName('')).toBe('상대방');
  });

  it('displayName 이 공백뿐이면 "상대방"', () => {
    expect(resolvePartnerName('   ')).toBe('상대방');
  });
});
