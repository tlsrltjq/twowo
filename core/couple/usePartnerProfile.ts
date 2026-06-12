import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { db } from '../config/firebase';
import { Couple } from './types';

export function usePartnerProfile(
  coupleId: string | null,
  myUid: string | null,
): { partnerUid: string | null; partnerName: string; couple: Couple | null } {
  const [couple, setCouple]       = useState<Couple | null>(null);
  const [partnerName, setPartnerName] = useState('상대방');

  const partnerUid = couple?.memberIds.find(id => id !== myUid) ?? null;

  useEffect(() => {
    if (!coupleId) return;
    return onSnapshot(doc(db, 'couples', coupleId), (snap) => {
      if (snap.exists()) setCouple({ id: snap.id, ...snap.data() } as Couple);
    });
  }, [coupleId]);

  useEffect(() => {
    if (!partnerUid) return;
    getDoc(doc(db, 'users', partnerUid)).then(snap => {
      const name = snap.data()?.displayName as string | undefined;
      setPartnerName(name ?? '상대방');
    });
  }, [partnerUid]);

  return { partnerUid, partnerName, couple };
}
