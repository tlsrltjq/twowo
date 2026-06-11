import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentData,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';

import { db } from '../../core/config/firebase';
import { PlaylistSong, PlaylistSongInput } from './schema';

function fromFirestore(id: string, data: DocumentData): PlaylistSong {
  return {
    id,
    coupleId:  data.coupleId,
    addedBy:   data.addedBy,
    title:     data.title,
    artist:    data.artist,
    period:    data.period ?? undefined,
    memo:      data.memo   ?? undefined,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
  };
}

// BR-1/2/3/4: addDoc — 고유 ID 자동 생성, 충돌 없음
export async function addSong(input: PlaylistSongInput): Promise<PlaylistSong> {
  const ref = await addDoc(collection(db, 'playlistSongs'), {
    coupleId:  input.coupleId,
    addedBy:   input.addedBy,
    title:     input.title,
    artist:    input.artist,
    period:    input.period?.trim() || null,
    memo:      input.memo?.trim()   || null,
    createdAt: serverTimestamp(),
  });
  return {
    id:        ref.id,
    coupleId:  input.coupleId,
    addedBy:   input.addedBy,
    title:     input.title,
    artist:    input.artist,
    period:    input.period?.trim() || undefined,
    memo:      input.memo?.trim()   || undefined,
    createdAt: new Date(),
  };
}

// BR-6: 본인 노래만 삭제 (rules에서도 강제)
export async function deleteSong(songId: string): Promise<void> {
  await deleteDoc(doc(db, 'playlistSongs', songId));
}

// BR-5: 커플 전체 목록 실시간 구독 (createdAt DESC)
export function subscribePlaylist(
  coupleId: string,
  cb: (songs: PlaylistSong[]) => void,
): () => void {
  const q = query(
    collection(db, 'playlistSongs'),
    where('coupleId', '==', coupleId),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snap) => { cb(snap.docs.map(d => fromFirestore(d.id, d.data() as DocumentData))); },
    (_err) => { cb([]); }, // 인덱스 미준비 / 권한 오류 시 빈 배열로 fallback — loading 해제
  );
}

export type { PlaylistSong, PlaylistSongInput } from './schema';
