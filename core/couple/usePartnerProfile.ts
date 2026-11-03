import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { db } from '../config/firebase';
import { Couple } from './types';

/** 상대 displayName 이 없거나 비어 있으면 '상대방'. 빈 문자열이 그대로 쓰이면 "의 메시지"처럼 이름이 빠져 보인다. */
export function resolvePartnerName(raw: unknown): string {
  return typeof raw === 'string' && raw.trim() ? raw.trim() : '상대방';
}

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
        setPartnerName(resolvePartnerName(snap.data()?.displayName));
      })
      .catch(err => setError(err));
  }, [partnerUid]);

  return { partnerUid, partnerName, couple, loading, error };
}
