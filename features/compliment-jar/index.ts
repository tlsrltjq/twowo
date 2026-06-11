import {
  addDoc,
  collection,
  DocumentData,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore' ;

import { db } from '../../core/config/firebase';

export interface Compliment {
  id: string;
  coupleId: string;
  fromUid: string;
  toUid: string;
  text: string;
  createdAt: Date;
}

function fromFirestore(id: string, data: DocumentData): Compliment {
  return {
    id,
    coupleId:  data.coupleId,
    fromUid:   data.fromUid,
    toUid:     data.toUid,
    text:      data.text,
    createdAt: data.createdAt?.toDate() ?? new Date(),
  };
}

// BR-CJ1: 최대 150자, 공백 금지
// BR-CJ3: toUid = 상대방
export async function addCompliment(
  coupleId: string,
  fromUid: string,
  toUid: string,
  text: string,
): Promise<void> {
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > 150) {
    throw new Error('칭찬은 1~150자여야 합니다');
  }
  await addDoc(collection(db, 'compliments'), {
    coupleId,
    fromUid,
    toUid,
    text: trimmed,
    createdAt: serverTimestamp(),
  });
}

// BR-CJ4: 실시간 구독
// BR-CJ5: createdAt DESC 정렬
export function subscribeCompliments(
  coupleId: string,
  cb: (compliments: Compliment[]) => void,
): () => void {
  const q = query(
    collection(db, 'compliments'),
    where('coupleId', '==', coupleId),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map(d => fromFirestore(d.id, d.data() as DocumentData)));
  });
}
