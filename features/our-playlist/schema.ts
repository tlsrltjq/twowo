import { z } from 'zod';

export const playlistSongInputSchema = z.object({
  coupleId: z.string().min(1),
  addedBy:  z.string().min(1),
  title:    z.string().min(1).max(80),   // BR-1
  artist:   z.string().min(1).max(60),   // BR-2
  period:   z.string().max(30).optional(), // BR-3
  memo:     z.string().max(100).optional(), // BR-4
});

export type PlaylistSongInput = z.infer<typeof playlistSongInputSchema>;

export interface PlaylistSong extends PlaylistSongInput {
  id:        string;
  createdAt: Date;
}
