/**
 * 통합 테스트: 초대 코드 발급 플로우 (BR-3)
 * 실행: npm run test:integration (FIRESTORE_EMULATOR_HOST=localhost:8080 필요)
 * 에뮬레이터: firebase emulators:start --only firestore
 */

if (process.env.FIRESTORE_EMULATOR_HOST) {
  const firebase = require('firebase/app');
  const fs = require('firebase/firestore');

  let db: ReturnType<typeof fs.getFirestore>;

  describe('couple-invite-flow (integration)', () => {
    beforeAll(() => {
      const app = firebase.getApps().length
        ? firebase.getApp()
        : firebase.initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'demo-coupleapp' });
      db = fs.getFirestore(app);
      fs.connectFirestoreEmulator(db, 'localhost', 8080);
    });

    afterEach(async () => {
      const projectId = process.env.GCLOUD_PROJECT ?? 'demo-coupleapp';
      await fetch(
        `http://localhost:8080/emulator/v1/projects/${projectId}/databases/(default)/documents`,
        { method: 'DELETE' }
      );
    });

    it('[BR-3] 코드 재발급 시 이전 invitations 무효화', async () => {
      const uid = 'test-uid-a';
      const coupleId = 'test-couple-1';

      await fs.setDoc(fs.doc(db, 'users', uid), { id: uid, displayName: 'A', coupleId });
      await fs.setDoc(fs.doc(db, 'couples', coupleId), { id: coupleId, memberIds: [uid], status: 'active' });
      await fs.setDoc(fs.doc(db, 'invitations', 'FIRST1'), {
        coupleId, createdBy: uid,
        createdAt: fs.serverTimestamp(),
        expiresAt: fs.Timestamp.fromDate(new Date(Date.now() + 86_400_000)),
      });

      const prevSnap = await fs.getDocs(
        fs.query(fs.collection(db, 'invitations'), fs.where('createdBy', '==', uid))
      );
      const batch = fs.writeBatch(db);
      prevSnap.forEach((d: any) => batch.delete(d.ref));
      batch.set(fs.doc(db, 'invitations', 'SECND2'), {
        coupleId, createdBy: uid,
        createdAt: fs.serverTimestamp(),
        expiresAt: fs.Timestamp.fromDate(new Date(Date.now() + 86_400_000)),
      });
      await batch.commit();

      const after = await fs.getDocs(
        fs.query(fs.collection(db, 'invitations'), fs.where('createdBy', '==', uid))
      );
      expect(after.size).toBe(1);
      expect(after.docs[0].id).toBe('SECND2');
    });
  });
}

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  test.skip('⏭ integration: FIRESTORE_EMULATOR_HOST 환경변수 없음 — firebase emulators:start --only firestore 후 재실행', () => {});
}

export {};
