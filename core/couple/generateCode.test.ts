import { generateCode } from './generateCode';

describe('generateCode', () => {
  it('[BR-2] 6자리 영숫자(가독성 제외 문자 없음)', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[A-Z2-9]+$/);
      expect(code).not.toMatch(/[0OI1]/);
    }
  });

  it('[BR-2] 항상 대문자만 사용', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateCode();
      expect(code).toBe(code.toUpperCase());
    }
  });

  it('[BR-2] 매 호출마다 다른 코드 생성 (충분한 엔트로피)', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateCode()));
    expect(codes.size).toBeGreaterThan(10);
  });
});
