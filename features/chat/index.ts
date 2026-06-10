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
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { db, storage } from '../../core/config/firebase';
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
  // 압축 (max 1080px)
  const compressed = await manipulateAsync(
    localUri,
    [{ resize: { width: 1080 } }],
    { compress: 0.75, format: SaveFormat.JPEG },
  );

  // 문서 ID 미리 생성 → Storage 경로와 일치
  const msgRef = doc(collection(db, 'couples', coupleId, 'messages'));
  const storagePath = `couples/${coupleId}/chat/${msgRef.id}.jpg`;
  const storageRef = ref(storage, storagePath);

  const resp = await fetch(compressed.uri);
  const blob = await resp.blob();
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  const downloadURL = await getDownloadURL(storageRef);

  await setDoc(msgRef, {
    senderId,
    text: '',
    imageUrl: downloadURL,
    createdAt: serverTimestamp(),
  });
}
