/**
 * 통합 테스트: 커플 조인 플로우 (BR-5)
 * 실행: firebase --config firebase.test.json emulators:exec ... "npm run test:integration"
 *
 * seed는 withSecurityRulesDisabled(admin context), 실제 트랜잭션만 authenticatedContext로 검증.
 */

import {
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  runTransaction,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

const PROJECT_ID = process.env.GCLOUD_PROJECT ?? 'demo-coupleapp';
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080';
const [host, portStr] = EMULATOR_HOST.split(':');
const port = parseInt(portStr ?? '8080', 10);

const rulesPath = join(__dirname, '../../firestore.rules');

if (process.env.FIRESTORE_EMULATOR_HOST) {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { host, port, rules: readFileSync(rulesPath, 'utf8') },
    });
  });

  afterEach(async () => {
    await testEnv.clearFirestore();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  describe('couple-join-flow (integration)', () => {
    it('[BR-5] join 트랜잭션 3단계 모두 성공 (couples + users + invitations 삭제)', async () => {
      const uidA = 'uid-a', uidB = 'uid-b', coupleId = 'couple-1', code = 'JOIN11';

      // seed: admin context (rules 우회)
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'couples', coupleId), {
          id: coupleId, memberIds: [uidA], status: 'active', createdAt: new Date(),
        });
        await setDoc(doc(db, 'users', uidA), { id: uidA, displayName: 'A', coupleId });
        await setDoc(doc(db, 'users', uidB), { id: uidB, displayName: 'B', coupleId: null });
        await setDoc(doc(db, 'invitations', code), {
          coupleId, createdBy: uidA,
          createdAt: new Date(),
          expiresAt: Timestamp.fromDate(new Date(Date.now() + 86_400_000)),
        });
      });

      // joinByCode: step1 트랜잭션 (couples + users + invitations.usedBy), step2 초대 코드 삭제
      const userBDb = testEnv.authenticatedContext(uidB).firestore();
      // step 1: 트랜잭션 — couples / users 업데이트 + invitations.usedBy 표시
      await assertSucceeds(
        runTransaction(userBDb, async (tx) => {
          const inv = await tx.get(doc(userBDb, 'invitations', code));
          const { coupleId: cId } = inv.data() as { coupleId: string };
          const coupleSnap = await tx.get(doc(userBDb, 'couples', cId));
          const memberIds = (coupleSnap.data() as { memberIds: string[] }).memberIds;
          tx.update(doc(userBDb, 'couples', cId), { memberIds: [...memberIds, uidB] });
          tx.update(doc(userBDb, 'users', uidB), { coupleId: cId });
          tx.update(doc(userBDb, 'invitations', code), { usedBy: uidB });
        }),
      );
      // step 2: 초대 코드 삭제 — invitations.usedBy == uid-b 조건으로 허용
      await assertSucceeds(deleteDoc(doc(userBDb, 'invitations', code)));

      // 검증
      const coupleSnap = await getDoc(doc(userBDb, 'couples', coupleId));
      expect((coupleSnap.data() as { memberIds: string[] }).memberIds).toEqual([uidA, uidB]);
      const userBSnap = await getDoc(doc(userBDb, 'users', uidB));
      expect((userBSnap.data() as { coupleId: string }).coupleId).toBe(coupleId);
      const invSnap = await getDoc(doc(userBDb, 'invitations', code));
      expect(invSnap.exists()).toBe(false);
    });
  });
}

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  test.skip('⏭ integration: FIRESTORE_EMULATOR_HOST 환경변수 없음 — firebase emulators:start --only firestore 후 재실행', () => {});
}

export {};
