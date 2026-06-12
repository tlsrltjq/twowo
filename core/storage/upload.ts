import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { addDoc, arrayUnion, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { db, storage } from '../config/firebase';

const MAX_PHOTOS = 20;

function newPhotoId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// 긴 쪽을 maxSide 이하로 축소. 이미 작으면 리사이즈 없이 재인코딩만(EXIF 제거 목적).
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
      // 세로 사진이면 height 기준, 가로/정방형이면 width 기준으로 축소
      if (origH > origW) ops.push({ resize: { height: maxSide } });
      else                ops.push({ resize: { width:  maxSide } });
    }
    // longer <= maxSide → 업스케일 없이 재인코딩만 (EXIF 제거)
  } else {
    ops.push({ resize: { width: maxSide } });
  }

  const result = await ImageManipulator.manipulateAsync(
    uri,
    ops,
    // SaveFormat.JPEG でEXIF を除去 (manipulateAsync は EXIF を保持しない)
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result;
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

  const [originalBlob, thumbBlob] = await Promise.all([
    FileSystem.readAsStringAsync(original.uri, { encoding: FileSystem.EncodingType.Base64 }),
    FileSystem.readAsStringAsync(thumb.uri,    { encoding: FileSystem.EncodingType.Base64 }),
  ]);

  function base64ToUint8Array(b64: string): Uint8Array {
    const binary = atob(b64);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return arr;
  }

  const originalPath = `${base}_original.jpg`;
  const thumbPath    = `${base}_thumb.jpg`;

  const [originalSnap, thumbSnap] = await Promise.all([
    uploadBytes(ref(storage, originalPath), base64ToUint8Array(originalBlob), { contentType: 'image/jpeg' }), // ①
    uploadBytes(ref(storage, thumbPath),    base64ToUint8Array(thumbBlob),    { contentType: 'image/jpeg' }), // ②
  ]);

  const [originalUrl, thumbUrl] = await Promise.all([
    getDownloadURL(originalSnap.ref),
    getDownloadURL(thumbSnap.ref),
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
