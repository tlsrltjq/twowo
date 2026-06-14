import * as ImageManipulator from 'expo-image-manipulator';
import { addDoc, arrayUnion, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { db, storage } from '../config/firebase';

const MAX_PHOTOS = 20;

function newPhotoId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function compress(
  uri: string,
  maxSide: number,
  quality: number,
  origW?: number,
  origH?: number,
): Promise<{ uri: string; width: number; height: number }> {
  const ops: ImageManipulator.Action[] = [];

  if (origW && origH) {
    const longer = Math.max(origW, origH);
    if (longer > maxSide) {
      if (origH > origW) ops.push({ resize: { height: maxSide } });
      else                ops.push({ resize: { width:  maxSide } });
    }
  } else {
    ops.push({ resize: { width: maxSide } });
  }

  const result = await ImageManipulator.manipulateAsync(
    uri,
    ops,
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result;
}

async function sdkUpload(storagePath: string, fileUri: string): Promise<string> {
  // fetch(file://) → blob()은 RN 네이티브 Blob을 반환하므로 XHR.send(blob)과 호환됨.
  // new Blob([Uint8Array])는 RN에서 동작하지 않아 File.bytes() 경로 불가.
  const response = await fetch(fileUri);
  const blob = await response.blob();
  const storageRef = ref(storage, storagePath);
  const result = await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(result.ref);
}

// BR-5: 20장 초과 시 거부
export function guardPhotoLimit(currentCount: number): void {
  if (currentCount >= MAX_PHOTOS) {
    throw new Error(`photoIds limit exceeded (max ${MAX_PHOTOS})`);
  }
}

// BR-6: 원본 1440px/0.75, 썸네일 400px/0.6. EXIF 제거(manipulateAsync 사용).
// BR-7: Storage 원본 → 썸네일 → Firestore photos → calendarEvents.photoIds 순서
export async function uploadPhoto(
  localUri: string,
  ctx: { coupleId: string; eventId: string; currentPhotoCount: number; width?: number; height?: number },
): Promise<{ photoId: string; originalUrl: string; thumbUrl: string }> {
  guardPhotoLimit(ctx.currentPhotoCount);

  const photoId = newPhotoId();
  const base = `couples/${ctx.coupleId}/events/${ctx.eventId}/${photoId}`;

  const { width: origW, height: origH } = ctx;
  const original = await compress(localUri, 1440, 0.75, origW, origH);
  const thumb    = await compress(localUri, 400,  0.6,  origW, origH);

  const originalPath = `${base}_original.jpg`;
  const thumbPath    = `${base}_thumb.jpg`;

  const [originalUrl, thumbUrl] = await Promise.all([
    sdkUpload(originalPath, original.uri), // ①
    sdkUpload(thumbPath, thumb.uri),        // ②
  ]);

  await addDoc(collection(db, 'photos'), { // ③
    id:            photoId,
    eventId:       ctx.eventId,
    coupleId:      ctx.coupleId,
    storagePath:   originalPath,
    thumbnailPath: thumbPath,
    originalUrl,
    thumbUrl,
    width:         original.width,
    height:        original.height,
    createdAt:     serverTimestamp(),
  });

  await updateDoc(doc(db, 'calendarEvents', ctx.eventId), { // ④
    photoIds:  arrayUnion(photoId),
    updatedAt: serverTimestamp(),
  });

  return { photoId, originalUrl, thumbUrl };
}
