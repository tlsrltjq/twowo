/**
 * 통합 테스트: 초대 코드 발급 플로우 (BR-3)
 * 실행: firebase --config firebase.test.json emulators:exec ... "npm run test:integration"
 *
 * seed는 withSecurityRulesDisabled(admin context), 실제 동작만 authenticatedContext로 검증.
 */

import {
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
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

  describe('couple-invite-flow (integration)', () => {
    it('[BR-3] 코드 재발급 시 이전 invitation 삭제 + 신규 생성 성공', async () => {
      const uid = 'test-uid-a';
      const coupleId = 'test-couple-1';

      // seed: admin context (rules 우회)
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'couples', coupleId), {
          id: coupleId, memberIds: [uid], status: 'active', createdAt: new Date(),
        });
        await setDoc(doc(db, 'users', uid), {
          id: uid, displayName: 'A', coupleId, activeInviteCode: 'FIRST1',
        });
        await setDoc(doc(db, 'invitations', 'FIRST1'), {
          coupleId, createdBy: uid,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86_400_000),
        });
      });

      // createInvite 패턴 재현: users/{uid} GET → activeInviteCode 읽기 → batch
      const userDb = testEnv.authenticatedContext(uid).firestore();
      const userSnap = await getDoc(doc(userDb, 'users', uid));
      const oldCode: string | undefined = (userSnap.data() as Record<string, unknown>).activeInviteCode as string | undefined;

      const batch = writeBatch(userDb);
      if (oldCode) batch.delete(doc(userDb, 'invitations', oldCode));
      batch.set(doc(userDb, 'invitations', 'SECND2'), {
        coupleId, createdBy: uid,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 86_400_000)),
      });
      batch.update(doc(userDb, 'users', uid), { activeInviteCode: 'SECND2' });
      await assertSucceeds(batch.commit());

      // 검증: admin context (invitations list:false 우회)
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        const old = await getDoc(doc(db, 'invitations', 'FIRST1'));
        expect(old.exists()).toBe(false);
        const next = await getDoc(doc(db, 'invitations', 'SECND2'));
        expect(next.exists()).toBe(true);
        expect(next.data()?.createdBy).toBe(uid);
      });
    });
  });
}

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  test.skip('⏭ integration: FIRESTORE_EMULATOR_HOST 환경변수 없음 — firebase emulators:start --only firestore 후 재실행', () => {});
}

export {};
