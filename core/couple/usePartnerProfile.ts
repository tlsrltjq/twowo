import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { db } from '../config/firebase';
import { Couple } from './types';

export function usePartnerProfile(
  coupleId: string | null,
  myUid: string | null,
): { partnerUid: string | null; partnerName: string; couple: Couple | null; loading: boolean; error: Error | null } {
  const [couple, setCouple]           = useState<Couple | null>(null);
  const [partnerName, setPartnerName] = useState('상대방');
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<Error | null>(null);

  const partnerUid = couple?.memberIds.find(id => id !== myUid) ?? null;

  useEffect(() => {
    if (!coupleId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, 'couples', coupleId),
      (snap) => {
        if (snap.exists()) setCouple({ id: snap.id, ...snap.data() } as Couple);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return unsub;
  }, [coupleId]);

  useEffect(() => {
    if (!partnerUid) return;
    getDoc(doc(db, 'users', partnerUid))
      .then(snap => {
        const name = snap.data()?.displayName as string | undefined;
        setPartnerName(name ?? '상대방');
      })
      .catch(err => setError(err));
  }, [partnerUid]);

  return { partnerUid, partnerName, couple, loading, error };
}
