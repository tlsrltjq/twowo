import {
  collection,
  doc,
  DocumentData,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore' ;

import { db } from '../../core/config/firebase';
import { getTodayKST } from '../../core/utils/date';

export type MessageType = 'night' | 'morning';

export interface NightMessage {
  id: string;
  coupleId: string;
  userId: string;
  date: string;
  type: MessageType;
  text: string;
  sentAt: Date;
}

function docId(coupleId: string, userId: string, date: string, type: MessageType): string {
  return `${coupleId}_${userId}_${date}_${type}`;
}

function fromFirestore(id: string, data: DocumentData): NightMessage {
  return {
    id,
    coupleId: data.coupleId,
    userId:   data.userId,
    date:     data.date,
    type:     data.type,
    text:     data.text,
    sentAt:   data.sentAt?.toDate() ?? new Date(),
  };
}

// BR-NM1: 결정론적 docId로 setDoc → 덮어쓰기(upsert)
// BR-NM2: 호출 전 text 검증은 UI 책임, 여기서도 guard
export async function sendNightMessage(
  coupleId: string,
  userId: string,
  type: MessageType,
  text: string,
): Promise<void> {
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > 100) {
    throw new Error('메시지는 1~100자여야 합니다');
  }
  const date = getTodayKST();
  const id   = docId(coupleId, userId, date, type);
  await setDoc(doc(db, 'nightMessages', id), {
    coupleId,
    userId,
    date,
    type,
    text:   trimmed,
    sentAt: serverTimestamp(),
  });
}

// BR-NM3: 오늘 날짜 두 유저 메시지를 실시간 구독
// BR-NM4: date 필드가 오늘(KST)인 문서만 반환
export function subscribeTodayMessages(
  coupleId: string,
  myUid: string,
  partnerUid: string,
  type: MessageType,
  cb: (mine: NightMessage | null, partner: NightMessage | null) => void,
): () => void {
  const today = getTodayKST();
  const q = query(
    collection(db, 'nightMessages'),
    where('coupleId', '==', coupleId),
    where('date', '==', today),
    where('type', '==', type),
  );
  return onSnapshot(q, (snap) => {
    let mine: NightMessage | null    = null;
    let partner: NightMessage | null = null;
    snap.docs.forEach(d => {
      const msg = fromFirestore(d.id, d.data() as DocumentData);
      if (msg.userId === myUid)      mine    = msg;
      else if (msg.userId === partnerUid) partner = msg;
    });
    cb(mine, partner);
  });
}
