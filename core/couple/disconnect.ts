import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';

import { db } from '../config/firebase';

// BR-D1: status:'disconnected' 전환. 문서 삭제 X.
export async function disconnectCouple(uid: string, coupleId: string): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId), {
    status:          'disconnected',
    disconnectedAt:  serverTimestamp(),
    disconnectedBy:  uid,
  });
}

// BR-D4: 재연결 — status:'active', disconnectedAt/By 제거
export async function reconnectCouple(coupleId: string): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId), {
    status:          'active',
    disconnectedAt:  null,
    disconnectedBy:  null,
  });
}
