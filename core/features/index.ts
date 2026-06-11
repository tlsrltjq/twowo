import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';

import registry from '../../feature-registry/registry';
import type { AppFeature } from '../../feature-registry/types';
import { db } from '../config/firebase';

export function getRegistry(): AppFeature[] {
  return registry;
}

// BR-L2: featureSettings/{coupleId}_{featureId} upsert. 문서 없음 = OFF 기본값.
export async function setFeatureEnabled(
  coupleId: string,
  featureId: string,
  enabled: boolean,
): Promise<void> {
  const ref = doc(db, 'featureSettings', `${coupleId}_${featureId}`);
  await setDoc(ref, { coupleId, featureId, enabled, updatedAt: serverTimestamp() });
}

// BR-L3: 커플 전체 featureSettings 실시간 구독. 문서 없는 featureId는 결과에 포함 안 됨 = false.
export function subscribeFeatureSettings(
  coupleId: string,
  cb: (settings: Record<string, boolean>) => void,
): () => void {
  const q = query(
    collection(db, 'featureSettings'),
    where('coupleId', '==', coupleId),
  );
  return onSnapshot(q, (snap) => {
    const settings: Record<string, boolean> = {};
    snap.docs.forEach(d => {
      const data = d.data();
      settings[data.featureId as string] = data.enabled as boolean;
    });
    cb(settings);
  });
}

export type { AppFeature };
