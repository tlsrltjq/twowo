import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';

const db = () => admin.firestore();

const COUPLE_COLLECTIONS = [
  'calendarEvents',
  'photos',
  'featureSettings',
  'moodChecks',
  'nightMessages',
  'compliments',
  'foodLogs',
  'firstMoments',
  'wishlistItems',
  'gratitudeEntries',
  'playlistSongs',
  'dateCandidates',
  'voteSessions',
  'bingoBoards',
  'invitations',
] as const;

async function deleteQueryBatch(
  ref: admin.firestore.CollectionReference | admin.firestore.Query,
  batchSize = 400,
): Promise<void> {
  const snap = await (ref as admin.firestore.CollectionReference).limit(batchSize).get();
  if (snap.empty) return;

  const batch = db().batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  if (snap.size >= batchSize) await deleteQueryBatch(ref, batchSize);
}

// BR-D3/D5/D6: 커플 문서·서브컬렉션·관련 컬렉션·Storage 전체 삭제, user.coupleId null 초기화
async function deleteCouple(coupleId: string, memberIds: string[]): Promise<void> {
  // 1. messages 서브컬렉션
  await deleteQueryBatch(db().collection('couples').doc(coupleId).collection('messages'));

  // 2. coupleId 참조 컬렉션들
  for (const col of COUPLE_COLLECTIONS) {
    const snap = await db().collection(col).where('coupleId', '==', coupleId).get();
    if (snap.empty) continue;
    const batch = db().batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  // 3. couples 문서
  await db().collection('couples').doc(coupleId).delete();

  // 4. 양쪽 user.coupleId null (BR-D6)
  const userBatch = db().batch();
  for (const uid of memberIds) {
    userBatch.update(db().collection('users').doc(uid), { coupleId: null });
  }
  await userBatch.commit();

  // 5. Storage couples/{coupleId}/ 전체 삭제 (BR-D5)
  try {
    const bucket = admin.storage().bucket('pair-38a4e.firebasestorage.app');
    await bucket.deleteFiles({ prefix: `couples/${coupleId}/` });
  } catch (e) {
    console.error(`[cleanup] Storage 삭제 실패 couple=${coupleId}`, e);
  }
}

// KST 01:00 (= UTC 16:00) 매일 실행
export const scheduledCleanup = onSchedule(
  { schedule: '0 16 * * *', timeZone: 'UTC' },
  async () => {
    const cutoff = Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

    const snap = await db().collection('couples').where('status', '==', 'disconnected').get();
    const toDelete = snap.docs.filter((doc) => {
      const dis = doc.data().disconnectedAt as Timestamp | undefined;
      return dis !== undefined && dis.seconds <= cutoff.seconds;
    });

    console.warn(`[cleanup] ${toDelete.length}건 삭제 예정`);

    for (const doc of toDelete) {
      const memberIds: string[] = doc.data().memberIds ?? [];
      await deleteCouple(doc.id, memberIds);
      console.warn(`[cleanup] couple ${doc.id} 삭제 완료`);
    }
  },
);
