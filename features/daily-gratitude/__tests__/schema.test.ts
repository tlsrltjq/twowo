import { gratitudeInputSchema } from '../schema';

describe('[BR-3] gratitudeInputSchema — message 1~100자', () => {
  const base = { coupleId: 'c1', userId: 'u1', message: '고마워' };

  test('유효한 입력 통과', () => {
    expect(() => gratitudeInputSchema.parse(base)).not.toThrow();
  });

  test('[BR-3] message 빈 문자열 → 거부', () => {
    expect(() => gratitudeInputSchema.parse({ ...base, message: '' })).toThrow();
  });

  test('[BR-3] message 100자 → 허용', () => {
    expect(() => gratitudeInputSchema.parse({ ...base, message: 'a'.repeat(100) })).not.toThrow();
  });

  test('[BR-3] message 101자 → 거부', () => {
    expect(() => gratitudeInputSchema.parse({ ...base, message: 'a'.repeat(101) })).toThrow();
  });

  test('coupleId 빈 문자열 → 거부', () => {
    expect(() => gratitudeInputSchema.parse({ ...base, coupleId: '' })).toThrow();
  });

  test('userId 빈 문자열 → 거부', () => {
    expect(() => gratitudeInputSchema.parse({ ...base, userId: '' })).toThrow();
  });
});
