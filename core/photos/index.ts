// ADR-032: 사진을 Cloud Storage 대신 Firestore 에 base64 JPEG 로 저장한다.
//   - 썸네일은 부모 문서 필드에 data URL 로 직접 저장
//   - 큰 이미지는 couples/{coupleId}/photoData/{photoId} 에 저장하고 'fsphoto:{coupleId}/{photoId}' 참조를 둔다
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { collection, deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { db } from '../config/firebase';

export const PHOTO_REF_PREFIX = 'fsphoto:';
/** Firestore 문서 한도(1MiB) 안에 들어가도록 잡은 base64 글자 수 상한. */
export const MAX_BASE64_CHARS = 900_000;

export type EncodedPhoto = { base64: string; width: number; height: number };

type EncodeOptions = {
  maxSide: number;
  quality: number;
  maxChars?: number;
  /** 원본 크기를 알면 넘긴다. 작은 사진을 키우지 않고, 세로 사진은 높이 기준으로 줄인다. */
  width?: number | undefined;
  height?: number | undefined;
};

function resizeOps(maxSide: number, width?: number, height?: number) {
  if (width === undefined || height === undefined) return [{ resize: { width: maxSide } }];
  if (Math.max(width, height) <= maxSide) return [];
  return height > width ? [{ resize: { height: maxSide } }] : [{ resize: { width: maxSide } }];
}

/** 긴 변을 maxSide 이하로 줄여 JPEG base64 로 인코딩. 상한을 넘으면 품질 → 크기 순으로 낮춰 다시 시도한다. */
export async function encodeJpeg(uri: string, opts: EncodeOptions): Promise<EncodedPhoto> {
  const maxChars = opts.maxChars ?? MAX_BASE64_CHARS;
  const attempts: [number, number][] = [
    [opts.maxSide, opts.quality],
    [opts.maxSide, Math.max(opts.quality - 0.2, 0.3)],
    [Math.round(opts.maxSide * 0.75), Math.max(opts.quality - 0.2, 0.3)],
    [Math.round(opts.maxSide * 0.5), 0.3],
  ];
  for (const [side, quality] of attempts) {
    const out = await manipulateAsync(uri, resizeOps(side, opts.width, opts.height), {
      compress: quality,
      format: SaveFormat.JPEG,
      base64: true,
    });
    if (out.base64 && out.base64.length <= maxChars) {
      return { base64: out.base64, width: out.width, height: out.height };
    }
  }
  throw new Error('photo too large to store in Firestore');
}

export function toDataUrl(base64: string): string {
  return `data:image/jpeg;base64,${base64}`;
}

export function isPhotoRef(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.startsWith(PHOTO_REF_PREFIX);
}

function photoDataPath(ref: string): string | null {
  const [coupleId, photoId] = ref.slice(PHOTO_REF_PREFIX.length).split('/');
  return coupleId && photoId ? `couples/${coupleId}/photoData/${photoId}` : null;
}

/** 큰 이미지를 photoData 에 저장하고 참조를 돌려준다. createdBy 는 보안 규칙상 로그인한 본인이어야 한다. */
export async function savePhotoData(coupleId: string, uid: string, photo: EncodedPhoto): Promise<string> {
  const ref = doc(collection(db, `couples/${coupleId}/photoData`));
  await setDoc(ref, {
    data:      photo.base64,
    width:     photo.width,
    height:    photo.height,
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
  return `${PHOTO_REF_PREFIX}${coupleId}/${ref.id}`;
}

// 같은 사진을 여러 화면에서 다시 읽지 않도록 메모리에 둔다(앱 실행 동안만).
const resolved = new Map<string, string>();

/** 참조는 data URL 로 풀고, data URL·http URL 은 그대로 돌려준다. 없는 참조는 null. */
export async function resolvePhotoUri(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  if (!isPhotoRef(value)) return value;
  const cached = resolved.get(value);
  if (cached) return cached;
  const path = photoDataPath(value);
  if (!path) return null;
  const [col, id] = [path.slice(0, path.lastIndexOf('/')), path.slice(path.lastIndexOf('/') + 1)];
  const snap = await getDoc(doc(db, col, id));
  const data = snap.exists() ? (snap.data()?.data as string | undefined) : undefined;
  if (!data) return null;
  const uri = toDataUrl(data);
  resolved.set(value, uri);
  return uri;
}

/** 참조가 가리키는 photoData 문서를 지운다. 참조가 아니면(구 Storage URL 등) 아무것도 하지 않는다. */
export async function deletePhotoData(value: string | null | undefined): Promise<void> {
  if (!isPhotoRef(value)) return;
  const path = photoDataPath(value);
  if (!path) return;
  const [col, id] = [path.slice(0, path.lastIndexOf('/')), path.slice(path.lastIndexOf('/') + 1)];
  await deleteDoc(doc(db, col, id));
  resolved.delete(value);
}
