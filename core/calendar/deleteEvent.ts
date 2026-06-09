import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';

import { db, storage } from '../config/firebase';

// BR-8: 이벤트 삭제 시 photos 메타 + Storage 원본/썸네일 모두 정리
export async function deleteEvent(eventId: string): Promise<void> {
  const photosSnap = await getDocs(
    query(collection(db, 'photos'), where('eventId', '==', eventId)),
  );

  await Promise.all(
    photosSnap.docs.map(async (photoDoc) => {
      const { storagePath, thumbnailPath } = photoDoc.data() as {
        storagePath: string;
        thumbnailPath: string;
      };
      await Promise.allSettled([
        deleteObject(ref(storage, storagePath)),
        deleteObject(ref(storage, thumbnailPath)),
      ]);
      await deleteDoc(photoDoc.ref);
    }),
  );

  await deleteDoc(doc(db, 'calendarEvents', eventId));
}
