import { calendarEventSchema } from '../schema';

const base = {
  coupleId:  'c1',
  createdBy: 'u1',
  title:     '점심',
  date:      new Date('2026-06-09'),
};

describe('calendarEventSchema', () => {
  test('[BR-2] general 타입 유효', () => {
    expect(() => calendarEventSchema.parse({ ...base, type: 'general' })).not.toThrow();
  });

  test('[BR-2] date 타입 유효', () => {
    expect(() => calendarEventSchema.parse({ ...base, type: 'date' })).not.toThrow();
  });

  test('[BR-2] type enum 3개 외 거부', () => {
    expect(() => calendarEventSchema.parse({ ...base, type: 'workout' })).toThrow();
  });

  test('[BR-3] exercise 일 때 exerciseData 없으면 거부', () => {
    expect(() => calendarEventSchema.parse({ ...base, type: 'exercise' })).toThrow();
  });

  test('[BR-3] exercise 일 때 exerciseData 있으면 통과', () => {
    expect(() =>
      calendarEventSchema.parse({
        ...base,
        type: 'exercise',
        exerciseData: { exerciseType: 'running', durationMinutes: 30 },
      }),
    ).not.toThrow();
  });

  test('[BR-4] rating 1~5 정수 유효', () => {
    expect(() =>
      calendarEventSchema.parse({ ...base, type: 'date', dateData: { rating: 3 } }),
    ).not.toThrow();
  });

  test('[BR-4] rating 0 거부', () => {
    expect(() =>
      calendarEventSchema.parse({ ...base, type: 'date', dateData: { rating: 0 } }),
    ).toThrow();
  });

  test('[BR-4] rating 6 거부', () => {
    expect(() =>
      calendarEventSchema.parse({ ...base, type: 'date', dateData: { rating: 6 } }),
    ).toThrow();
  });

  test('[BR-4] rating 소수 거부', () => {
    expect(() =>
      calendarEventSchema.parse({ ...base, type: 'date', dateData: { rating: 3.5 } }),
    ).toThrow();
  });
});
