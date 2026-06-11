/**
 * 통합 테스트: Firestore Security Rules 검증
 * 실행: firebase --config firebase.test.json emulators:exec ... "npm run test:integration"
 *
 * 주의: 이 파일은 firestore.rules (프로덕션 규칙) 를 로드한 에뮬레이터에서만 의미 있음.
 *       firebase.test.json 은 firestore.rules.test (allow all) 를 사용하므로,
 *       CI 기본 실행에서는 이 테스트가 skip 됨.
 *       프로덕션 규칙 검증은 별도로:
 *         firebase emulators:exec --only firestore --project demo-coupleapp "npm run test:integration"
 *       로 실행 (firebase.json 기본값 = firestore.rules 로드).
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

const PROJECT_ID = process.env.GCLOUD_PROJECT ?? 'demo-coupleapp';
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080';
const [host, portStr] = EMULATOR_HOST.split(':');
const port = parseInt(portStr ?? '8080', 10);

// 보안 규칙 파일 경로 (프로젝트 루트)
const rulesPath = join(__dirname, '../../firestore.rules');

if (process.env.FIRESTORE_EMULATOR_HOST) {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host,
        port,
        rules: readFileSync(rulesPath, 'utf8'),
      },
    });
  });

  afterEach(async () => {
    await testEnv.clearFirestore();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  describe('security-rules (integration)', () => {
    it('비멤버가 couples 문서 get → PERMISSION_DENIED', async () => {
      // 커플 문서 생성 (unauthenticated admin 사용)
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'couples', 'couple-1'), {
          id: 'couple-1',
          memberIds: ['uid-a', 'uid-b'],
          status: 'active',
          createdAt: new Date(),
        });
      });

      // uid-c는 멤버가 아님 → PERMISSION_DENIED 예상
      const outsiderDb = testEnv.authenticatedContext('uid-c').firestore();
      await assertFails(getDoc(doc(outsiderDb, 'couples', 'couple-1')));
    });

    it('invitations list 쿼리 → PERMISSION_DENIED (브루트포스 방지)', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'invitations', 'ABC123'), {
          coupleId: 'couple-1',
          createdBy: 'uid-a',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86_400_000),
        });
      });

      // list 는 인증 사용자도 금지 (allow list: if false)
      const userDb = testEnv.authenticatedContext('uid-x').firestore();
      await assertFails(
        getDocs(query(collection(userDb, 'invitations'), where('coupleId', '==', 'couple-1')))
      );
    });

    it('같은 커플 상대방 user 문서 get → 허용', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'users', 'uid-a'), { id: 'uid-a', displayName: 'A', coupleId: 'couple-1' });
        await setDoc(doc(db, 'users', 'uid-b'), { id: 'uid-b', displayName: 'B', coupleId: 'couple-1' });
      });

      // uid-a가 uid-b 문서 읽기 → 같은 커플이므로 허용
      const userADb = testEnv.authenticatedContext('uid-a').firestore();
      await assertSucceeds(getDoc(doc(userADb, 'users', 'uid-b')));
    });
  });
}

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  test.skip('⏭ integration: FIRESTORE_EMULATOR_HOST 환경변수 없음', () => {});
}

export {};
