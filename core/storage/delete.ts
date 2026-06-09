import { arrayRemove, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';

import { db, storage } from '../config/firebase';

export async function deletePhoto(photoId: string): Promise<void> {
  const snap = await getDocs(
    query(collection(db, 'photos'), where('id', '==', photoId)),
  );
  if (snap.empty) return;

  const photoDoc = snap.docs[0]!;
  const { storagePath, thumbnailPath, eventId } = photoDoc.data() as {
    storagePath: string;
    thumbnailPath: string;
    eventId: string;
  };

  await Promise.allSettled([
    deleteObject(ref(storage, storagePath)),
    deleteObject(ref(storage, thumbnailPath)),
  ]);
  await deleteDoc(photoDoc.ref);
  await updateDoc(doc(db, 'calendarEvents', eventId), {
    photoIds:  arrayRemove(photoId),
    updatedAt: serverTimestamp(),
  });
}
