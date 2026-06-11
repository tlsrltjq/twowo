import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  DocumentData,
} from 'firebase/firestore' ;

import { db } from '../../core/config/firebase';
import { getTodayKST } from '../../core/utils/date';

export interface FirstMoment {
  id: string;
  coupleId: string;
  addedBy: string;
  title: string;
  date: string;
  memo?: string;
  createdAt: Date;
}

function fromFirestore(id: string, data: DocumentData): FirstMoment {
  return {
    id,
    coupleId: data.coupleId,
    addedBy:  data.addedBy,
    title:    data.title,
    date:     data.date,
    memo:     data.memo,
    createdAt: data.createdAt?.toDate() ?? new Date(),
  };
}

// BR-FM1: 제목 1~60자
// BR-FM2: 과거 날짜만 (오늘 포함)
// BR-FM3: 메모 선택
export async function addFirstMoment(
  coupleId: string,
  addedBy: string,
  title: string,
  date: string,
  memo?: string,
): Promise<void> {
  const trimmedTitle = title.trim();
  if (trimmedTitle.length === 0 || trimmedTitle.length > 60) {
    throw new Error('제목은 1~60자여야 합니다');
  }
  const today = getTodayKST();
  if (date > today) {
    throw new Error('과거 날짜만 기록할 수 있어요');
  }
  const payload: DocumentData = {
    coupleId,
    addedBy,
    title: trimmedTitle,
    date,
    createdAt: serverTimestamp(),
  };
  if (memo && memo.trim()) {
    payload.memo = memo.trim().slice(0, 100);
  }
  await addDoc(collection(db, 'firstMoments'), payload);
}

// BR-FM5: 삭제 (보안 규칙에서 addedBy == uid 강제)
export async function deleteFirstMoment(id: string): Promise<void> {
  await deleteDoc(doc(db, 'firstMoments', id));
}

// BR-FM4: 실시간
// BR-FM6: date ASC
export function subscribeFirstMoments(
  coupleId: string,
  cb: (moments: FirstMoment[]) => void,
): () => void {
  const q = query(
    collection(db, 'firstMoments'),
    where('coupleId', '==', coupleId),
    orderBy('date', 'asc'),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map(d => fromFirestore(d.id, d.data() as DocumentData)));
  });
}
