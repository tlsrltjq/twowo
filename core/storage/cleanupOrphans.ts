import { collection, getDocs, query, where } from 'firebase/firestore';
import { deleteObject, listAll, ref } from 'firebase/storage';

import { db, storage } from '../config/firebase';

// 앱 실행 시 Firestore 메타 없는 Storage 객체 정리 (edge case: 업로드 중 앱 종료)
export async function cleanupOrphans(coupleId: string): Promise<{ removed: number }> {
  const folder = ref(storage, `couples/${coupleId}/events`);
  let listResult;
  try {
    listResult = await listAll(folder);
  } catch {
    return { removed: 0 };
  }

  // 하위 이벤트 폴더 순회
  let removed = 0;
  for (const eventFolder of listResult.prefixes) {
    const items = await listAll(eventFolder);
    for (const item of items.items) {
      // Storage 경로에서 photoId 추출 (예: {photoId}_original.jpg → photoId)
      const name  = item.name;
      const match = name.match(/^(.+?)_(original|thumb)\.jpg$/);
      if (!match) continue;
      const photoId = match[1]!;

      const snap = await getDocs(
        query(collection(db, 'photos'), where('id', '==', photoId)),
      );
      if (snap.empty) {
        await deleteObject(item).catch(() => undefined);
        removed++;
      }
    }
  }

  return { removed };
}
