export interface Couple {
  id: string;
  memberIds: string[];
  createdAt: Date;
  anniversaryDate?: Date;
  status: 'active' | 'disconnected';
  disconnectedAt?: Date;
  disconnectedBy?: string;
}

export type JoinErrorReason = 'expired' | 'not_found' | 'self' | 'already_joined' | 'couple_full';

export class JoinError extends Error {
  constructor(public readonly reason: JoinErrorReason) {
    super(`join_failed:${reason}`);
    this.name = 'JoinError';
  }
}
