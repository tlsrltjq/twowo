import { z } from 'zod';

export const eventTypeSchema = z.enum(['date', 'exercise', 'general']); // BR-2
export type EventType = z.infer<typeof eventTypeSchema>;

export const moodSchema = z.enum(['great', 'good', 'okay', 'bad']);
export type Mood = z.infer<typeof moodSchema>;

const exerciseDataSchema = z.object({
  exerciseType:    z.string().min(1),
  durationMinutes: z.number().int().positive(),
  distanceKm:      z.number().positive().optional(),
  memo:            z.string().optional(),
});

const dateDataSchema = z.object({
  mood:   moodSchema.optional(),
  rating: z.number().int().min(1).max(5).optional(), // BR-4
});

export const calendarEventSchema = z
  .object({
    coupleId:      z.string(),
    createdBy:     z.string(),
    type:          eventTypeSchema,
    title:         z.string().min(1).max(100),
    date:          z.date(),
    endDate:       z.date().optional(),
    placeName:     z.string().max(100).optional(),
    placeAddress:  z.string().max(200).optional(),
    memo:          z.string().max(500).optional(),
    tags:          z.array(z.string()).optional(),
    exerciseData:  exerciseDataSchema.optional(),
    dateData:      dateDataSchema.optional(),
  })
  .superRefine((val, ctx) => { // BR-3: exercise 타입이면 exerciseData 필수
    if (val.type === 'exercise' && !val.exerciseData) {
      ctx.addIssue({ code: 'custom', path: ['exerciseData'], message: 'exerciseData is required for exercise events' });
    }
  });

export type CalendarEventInput = z.infer<typeof calendarEventSchema>;

export interface CalendarEvent extends CalendarEventInput {
  id:        string;
  photoIds:  string[];
  createdAt: Date;
  updatedAt: Date;
}
