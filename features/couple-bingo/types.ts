export interface BingoBoard {
  id: string;
  coupleId: string;
  status: 'active' | 'completed';
  items: string[];                                    // 길이 25 고정 (BR-2)
  checkedItems: Record<string, true>;                // stringified index → true
  checkedBy: Record<string, { uid: string; at: Date | null }>;
  completedLines: number[];                          // 0~11 (BR-5)
  startedAt: Date | null;
  completedAt?: Date | null;
}
