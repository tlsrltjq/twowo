import { z } from 'zod';

export const moodSchema = z.enum(['great', 'good', 'okay', 'bad']); // BR-4
export type Mood = z.infer<typeof moodSchema>;

export const moodCheckInputSchema = z.object({
  coupleId: z.string().min(1),
  userId:   z.string().min(1),
  energy:   z.number().int().min(1).max(5),   // BR-4
  mood:     moodSchema,                         // BR-4
  canMeet:  z.boolean(),
  memo:     z.string().max(200).optional(),    // BR-5
});

export type MoodCheckInput = z.infer<typeof moodCheckInputSchema>;

export interface MoodCheck extends MoodCheckInput {
  id:        string;   // {coupleId}_{userId}_{YYYY-MM-DD}
  date:      string;   // 'YYYY-MM-DD' (KST)
  createdAt: Date;
  updatedAt: Date;
}

export class MoodLockedError extends Error {
  constructor(msg = '오늘 컨디션은 이미 잠겼습니다') {
    super(msg);
    this.name = 'MoodLockedError';
  }
}
