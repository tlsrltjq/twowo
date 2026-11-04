import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';

import { db, storage } from '../config/firebase';
import { deletePhotoData } from '../photos';

// BR-8: 이벤트 삭제 시 photos 메타와 사진 데이터 모두 정리
//   - ADR-032 이후: originalUrl 이 가리키는 photoData 문서 삭제 (썸네일은 photos 문서 안에 있음)
//   - 이전 데이터: Storage 원본/썸네일 삭제 시도(결제 계정 종료로 실패할 수 있어 무시)
export async function deleteEvent(eventId: string): Promise<void> {
  const photosSnap = await getDocs(
    query(collection(db, 'photos'), where('eventId', '==', eventId)),
  );

  await Promise.all(
    photosSnap.docs.map(async (photoDoc) => {
      const { originalUrl, storagePath, thumbnailPath } = photoDoc.data() as {
        originalUrl?: string;
        storagePath?: string;
        thumbnailPath?: string;
      };
      await Promise.allSettled([
        deletePhotoData(originalUrl),
        ...[storagePath, thumbnailPath]
          .filter((p): p is string => !!p)
          .map(p => deleteObject(ref(storage, p))),
      ]);
      await deleteDoc(photoDoc.ref);
    }),
  );

  await deleteDoc(doc(db, 'calendarEvents', eventId));
}
