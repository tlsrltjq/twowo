import { arrayRemove, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';

import { db, storage } from '../config/firebase';
import { deletePhotoData } from '../photos';

export async function deletePhoto(photoId: string): Promise<void> {
  const snap = await getDocs(
    query(collection(db, 'photos'), where('id', '==', photoId)),
  );
  if (snap.empty) return;

  const photoDoc = snap.docs[0]!;
  const { originalUrl, storagePath, thumbnailPath, eventId } = photoDoc.data() as {
    originalUrl?: string;
    storagePath?: string;
    thumbnailPath?: string;
    eventId: string;
  };

  // ADR-032: photoData 문서 삭제. 이전 데이터만 Storage 삭제를 시도하고 실패는 무시한다.
  await Promise.allSettled([
    deletePhotoData(originalUrl),
    ...[storagePath, thumbnailPath]
      .filter((p): p is string => !!p)
      .map(p => deleteObject(ref(storage, p))),
  ]);
  await deleteDoc(photoDoc.ref);
  await updateDoc(doc(db, 'calendarEvents', eventId), {
    photoIds:  arrayRemove(photoId),
    updatedAt: serverTimestamp(),
  });
}
