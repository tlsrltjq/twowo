import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '../../core/config/firebase';

export interface WishlistItem {
  id: string;
  coupleId: string;
  addedBy: string;
  name: string;
  memo?: string;
  priceRange?: string;
  received: boolean;
  createdAt: Date;
}

function fromFirestore(id: string, data: Record<string, any>): WishlistItem {
  return {
    id,
    coupleId:   data.coupleId,
    addedBy:    data.addedBy,
    name:       data.name,
    memo:       data.memo,
    priceRange: data.priceRange,
    received:   data.received ?? false,
    createdAt:  data.createdAt?.toDate() ?? new Date(),
  };
}

// BR-GW1: 1~60자, 공백 금지
// BR-GW3: addedBy = 요청자
export async function addWishlistItem(
  coupleId: string,
  addedBy: string,
  name: string,
  memo?: string,
  priceRange?: string,
): Promise<void> {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 60) {
    throw new Error('아이템 이름은 1~60자여야 합니다');
  }
  const payload: Record<string, any> = {
    coupleId,
    addedBy,
    name: trimmed,
    received: false,
    createdAt: serverTimestamp(),
  };
  if (memo && memo.trim())           payload.memo       = memo.trim().slice(0, 100);
  if (priceRange && priceRange.trim()) payload.priceRange = priceRange.trim().slice(0, 30);
  await addDoc(collection(db, 'wishlistItems'), payload);
}

// BR-GW4: 받음 토글 (true/false)
export async function toggleReceived(id: string, received: boolean): Promise<void> {
  await updateDoc(doc(db, 'wishlistItems', id), { received });
}

// BR-GW6: 본인 아이템 삭제
export async function deleteWishlistItem(id: string): Promise<void> {
  await deleteDoc(doc(db, 'wishlistItems', id));
}

// BR-GW5: 실시간 구독 (coupleId 기준, createdAt ASC)
export function subscribeWishlist(
  coupleId: string,
  cb: (items: WishlistItem[]) => void,
): () => void {
  const q = query(
    collection(db, 'wishlistItems'),
    where('coupleId', '==', coupleId),
    orderBy('createdAt', 'asc'),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map(d => fromFirestore(d.id, d.data() as Record<string, any>)));
  });
}
