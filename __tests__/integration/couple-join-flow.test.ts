/**
 * 통합 테스트: 커플 조인 플로우 (BR-5)
 * 실행: npm run test:integration (FIRESTORE_EMULATOR_HOST=localhost:8080 필요)
 * 에뮬레이터: firebase emulators:start --only firestore
 */

if (process.env.FIRESTORE_EMULATOR_HOST) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const firebase = require('firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('firebase/firestore');

  let db: ReturnType<typeof fs.getFirestore>;

  describe('couple-join-flow (integration)', () => {
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

    it('[BR-5] join 트랜잭션 3단계 모두 성공 (couples + users + invitations 삭제)', async () => {
      const uidA = 'uid-a', uidB = 'uid-b', coupleId = 'couple-1', code = 'JOIN11';

      await fs.setDoc(fs.doc(db, 'couples', coupleId), { id: coupleId, memberIds: [uidA], status: 'active' });
      await fs.setDoc(fs.doc(db, 'users', uidA), { id: uidA, displayName: 'A', coupleId });
      await fs.setDoc(fs.doc(db, 'users', uidB), { id: uidB, displayName: 'B', coupleId: null });
      await fs.setDoc(fs.doc(db, 'invitations', code), {
        coupleId, createdBy: uidA,
        createdAt: fs.serverTimestamp(),
        expiresAt: fs.Timestamp.fromDate(new Date(Date.now() + 86_400_000)),
      });

      await fs.runTransaction(db, async (tx: any) => {
        const inv = await tx.get(fs.doc(db, 'invitations', code));
        expect(inv.exists()).toBe(true);
        const { coupleId: cId } = inv.data();
        const coupleSnap = await tx.get(fs.doc(db, 'couples', cId));
        const memberIds: string[] = coupleSnap.data().memberIds;
        tx.update(fs.doc(db, 'couples', cId), { memberIds: [...memberIds, uidB] });
        tx.update(fs.doc(db, 'users', uidB), { coupleId: cId });
        tx.delete(fs.doc(db, 'invitations', code));
      });

      const coupleSnap = await fs.getDoc(fs.doc(db, 'couples', coupleId));
      expect(coupleSnap.data()!.memberIds).toEqual([uidA, uidB]);
      const userBSnap = await fs.getDoc(fs.doc(db, 'users', uidB));
      expect(userBSnap.data()!.coupleId).toBe(coupleId);
      const invSnap = await fs.getDoc(fs.doc(db, 'invitations', code));
      expect(invSnap.exists()).toBe(false);
    });
  });
}

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  test.skip('⏭ integration: FIRESTORE_EMULATOR_HOST 환경변수 없음 — firebase emulators:start --only firestore 후 재실행', () => {});
}

export {};
