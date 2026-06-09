import { moodCheckInputSchema } from '../schema';

describe('[BR-4] moodCheckInputSchema — energy 1~5, mood enum 4종', () => {
  const base = { coupleId: 'c1', userId: 'u1', energy: 3, mood: 'good' as const, canMeet: true };

  test('유효한 입력 통과', () => {
    expect(() => moodCheckInputSchema.parse(base)).not.toThrow();
  });

  test('[BR-4] energy 0 → 거부', () => {
    expect(() => moodCheckInputSchema.parse({ ...base, energy: 0 })).toThrow();
  });

  test('[BR-4] energy 6 → 거부', () => {
    expect(() => moodCheckInputSchema.parse({ ...base, energy: 6 })).toThrow();
  });

  test('[BR-4] energy 소수(1.5) → 거부', () => {
    expect(() => moodCheckInputSchema.parse({ ...base, energy: 1.5 })).toThrow();
  });

  test.each(['great', 'good', 'okay', 'bad'])('[BR-4] mood=%s 허용', (mood) => {
    expect(() => moodCheckInputSchema.parse({ ...base, mood })).not.toThrow();
  });

  test('[BR-4] mood 잘못된 값 → 거부', () => {
    expect(() => moodCheckInputSchema.parse({ ...base, mood: 'amazing' })).toThrow();
  });

  test('[BR-5] memo 200자 허용', () => {
    expect(() => moodCheckInputSchema.parse({ ...base, memo: 'a'.repeat(200) })).not.toThrow();
  });

  test('[BR-5] memo 201자 → 거부', () => {
    expect(() => moodCheckInputSchema.parse({ ...base, memo: 'a'.repeat(201) })).toThrow();
  });
});
