import { z } from 'zod';

export const gratitudeInputSchema = z.object({
  coupleId: z.string().min(1),
  userId:   z.string().min(1),
  message:  z.string().min(1).max(100), // BR-3
});

export type GratitudeInput = z.infer<typeof gratitudeInputSchema>;

export interface GratitudeEntry extends GratitudeInput {
  id:        string;  // {coupleId}_{userId}_{YYYY-MM-DD}
  date:      string;  // 'YYYY-MM-DD' (KST)
  createdAt: Date;
  updatedAt: Date;
}

export class GratitudeLockError extends Error {
  constructor(msg = '오늘만 수정할 수 있어요') {
    super(msg);
    this.name = 'GratitudeLockError';
  }
}
