import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from '../../core/config/firebase';
import type { Message } from './types';

export type { Message };

export function subscribeMessages(
  coupleId: string,
  cb: (messages: Message[]) => void,
): () => void {
  const ref = collection(db, 'couples', coupleId, 'messages');
  const q = query(ref, orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(q, snap => {
    cb(
      snap.docs.map(d => ({
        id: d.id,
        senderId: d.data().senderId as string,
        text: d.data().text as string,
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
  await addDoc(collection(db, 'couples', coupleId, 'messages'), {
    senderId,
    text: text.trim(),
    createdAt: serverTimestamp(),
  });
}
