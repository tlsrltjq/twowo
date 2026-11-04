// 일정 사진 업로드 (ADR-032: Cloud Storage 대신 Firestore 에 저장)
import { arrayUnion, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

import { auth, db } from '../config/firebase';
import { encodeJpeg, savePhotoData, toDataUrl } from '../photos';

const MAX_PHOTOS = 20;

function newPhotoId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// BR-5: 20장 초과 시 거부
export function guardPhotoLimit(currentCount: number): void {
  if (currentCount >= MAX_PHOTOS) {
    throw new Error(`photoIds limit exceeded (max ${MAX_PHOTOS})`);
  }
}

// BR-6: 큰 이미지 1280px/0.7, 썸네일 400px/0.6. EXIF 제거(manipulateAsync 재인코딩).
// BR-7: 큰 이미지(photoData) → photos 문서(썸네일 포함) → calendarEvents.photoIds 순서
export async function uploadPhoto(
  localUri: string,
  ctx: { coupleId: string; eventId: string; currentPhotoCount: number; width?: number; height?: number },
): Promise<{ photoId: string; originalUrl: string; thumbUrl: string }> {
  guardPhotoLimit(ctx.currentPhotoCount);

  const uid = auth.currentUser!.uid;
  const photoId = newPhotoId();
  const size = { width: ctx.width, height: ctx.height };

  const [original, thumb] = await Promise.all([
    encodeJpeg(localUri, { maxSide: 1280, quality: 0.7, ...size }),
    encodeJpeg(localUri, { maxSide: 400, quality: 0.6, maxChars: 120_000, ...size }),
  ]);

  const originalUrl = await savePhotoData(ctx.coupleId, uid, original); // ①
  const thumbUrl = toDataUrl(thumb.base64);

  // ② 문서 ID = photoId 로 고정 → getDoc(doc(db,'photos',photoId)) 직접 조회 가능
  await setDoc(doc(db, 'photos', photoId), {
    id:        photoId,
    eventId:   ctx.eventId,
    coupleId:  ctx.coupleId,
    originalUrl,
    thumbUrl,
    width:     original.width,
    height:    original.height,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'calendarEvents', ctx.eventId), { // ③
    photoIds:  arrayUnion(photoId),
    updatedAt: serverTimestamp(),
  });

  return { photoId, originalUrl, thumbUrl };
}
