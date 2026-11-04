import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';

import { db } from '../../core/config/firebase';
import { encodeJpeg, savePhotoData } from '../../core/photos';
import type { Message } from './types';

export type { Message };
export type { PendingImage } from './types';

export function subscribeMessages(
  coupleId: string,
  cb: (messages: Message[]) => void,
): () => void {
  const q = query(
    collection(db, 'couples', coupleId, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(50),
  );
  return onSnapshot(q, snap => {
    cb(
      snap.docs.map(d => ({
        id: d.id,
        senderId: d.data().senderId as string,
        text: d.data().text as string,
        ...(d.data().imageUrl ? { imageUrl: d.data().imageUrl as string } : {}),
        createdAt: d.data().createdAt?.toDate() ?? null,
      })),
    );
  });
}

export async function sendMessage(
  coupleId: string,
  senderId: string,
  text: string,
): Promise<void> {
  if (text.length > 1000) throw new Error('텍스트는 최대 1000자입니다');
  await addDoc(collection(db, 'couples', coupleId, 'messages'), {
    senderId,
    text: text.trim(),
    createdAt: serverTimestamp(),
  });
}

export function subscribeUnreadCount(
  coupleId: string,
  myUid: string,
  since: Date,
  cb: (n: number) => void,
): () => void {
  const q = query(
    collection(db, 'couples', coupleId, 'messages'),
    where('createdAt', '>', Timestamp.fromDate(since)),
    limit(10),
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.filter(d => d.data().senderId !== myUid).length);
  });
}

export async function sendImageMessage(
  coupleId: string,
  senderId: string,
  localUri: string,
): Promise<void> {
  // ADR-032: 긴 변 1080px JPEG 를 photoData 에 저장하고 참조를 imageUrl 에 둔다
  const encoded = await encodeJpeg(localUri, { maxSide: 1080, quality: 0.7 });
  const msgRef = doc(collection(db, 'couples', coupleId, 'messages'));
  const downloadURL = await savePhotoData(coupleId, senderId, encoded);

  await setDoc(msgRef, {
    senderId,
    text: '',
    imageUrl: downloadURL,
    createdAt: serverTimestamp(),
  });
}
