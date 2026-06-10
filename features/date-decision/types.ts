export type VoteCategory = 'food' | 'activity' | 'travel' | 'etc';

export interface DateCandidate {
  id: string;
  coupleId: string;
  title: string;
  category: VoteCategory;
  createdBy: string;
  createdAt: Date;
}

export interface VoteSession {
  id: string;
  coupleId: string;
  status: 'in_progress' | 'revealed';
  choices: Record<string, string>;  // { [uid]: candidateId }
  startedAt: Date | null;
  revealedAt?: Date | null;
}

export const CATEGORY_LABELS: Record<VoteCategory, string> = {
  food:     '🍽 식사',
  activity: '🎯 활동',
  travel:   '✈️ 여행',
  etc:      '✨ 기타',
};
