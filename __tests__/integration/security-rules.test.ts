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
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
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

    // ─── A1: users.coupleId 위변조 차단 ───────────────────────────────────────

    it('A1: users.coupleId 직접 변경(위변조) → PERMISSION_DENIED', async () => {
      // uid-a는 couple-a 소속, couple-b는 uid-c/uid-d 소속
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'users', 'uid-a'), { id: 'uid-a', displayName: 'A', coupleId: 'couple-a' });
        await setDoc(doc(db, 'couples', 'couple-a'), { id: 'couple-a', memberIds: ['uid-a', 'uid-b'], status: 'active', createdAt: new Date() });
        await setDoc(doc(db, 'couples', 'couple-b'), { id: 'couple-b', memberIds: ['uid-c', 'uid-d'], status: 'active', createdAt: new Date() });
      });

      // 악성 클라이언트: uid-a가 자신의 coupleId를 couple-b로 바꾸려는 시도
      const uidADb = testEnv.authenticatedContext('uid-a').firestore();
      await assertFails(
        updateDoc(doc(uidADb, 'users', 'uid-a'), { coupleId: 'couple-b' })
      );
    });

    it('A1: users.coupleId 직접 변경(위변조) 후 타 커플 데이터 접근 → PERMISSION_DENIED', async () => {
      // 취약점 시나리오: coupleId 위변조가 성공한다면 상대 커플 칭찬 저금통에 접근 가능
      // 이 테스트는 update 자체가 막히므로 이중 방어 확인
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'users', 'uid-a'), { id: 'uid-a', displayName: 'A', coupleId: 'couple-a' });
        await setDoc(doc(db, 'couples', 'couple-b'), { id: 'couple-b', memberIds: ['uid-c', 'uid-d'], status: 'active', createdAt: new Date() });
        await setDoc(doc(db, 'compliments', 'cpl-1'), { coupleId: 'couple-b', fromUid: 'uid-c', toUid: 'uid-d', text: 'secret', createdAt: new Date() });
      });

      // uid-a는 couple-a 소속 → couple-b 칭찬 데이터 접근 불가
      const uidADb = testEnv.authenticatedContext('uid-a').firestore();
      await assertFails(getDoc(doc(uidADb, 'compliments', 'cpl-1')));
    });

    it('A1: join 트랜잭션(getAfter 증명) → 허용', async () => {
      // uid-a가 couple-x를 생성하고, uid-b가 join → users/uid-b.coupleId = couple-x
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'users', 'uid-b'), { id: 'uid-b', displayName: 'B', coupleId: null });
        await setDoc(doc(db, 'couples', 'couple-x'), { id: 'couple-x', memberIds: ['uid-a'], status: 'active', createdAt: new Date() });
      });

      // uid-b가 join 트랜잭션 실행: couples 업데이트 + users.coupleId 설정
      const uidBDb = testEnv.authenticatedContext('uid-b').firestore();
      await assertSucceeds(
        runTransaction(uidBDb, async (tx) => {
          const coupleRef = doc(uidBDb, 'couples', 'couple-x');
          const userRef   = doc(uidBDb, 'users', 'uid-b');
          const coupleSnap = await tx.get(coupleRef);
          tx.update(coupleRef, { memberIds: [...(coupleSnap.data()!.memberIds as string[]), 'uid-b'] });
          tx.update(userRef, { coupleId: 'couple-x' });
        })
      );
    });

    // ─── A2: couples 허용 필드 제한 ───────────────────────────────────────────

    it('A2: couples.status 직접 변경(disconnected) → 유효한 disconnect 형식이면 허용', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'users', 'uid-a'), { id: 'uid-a', displayName: 'A', coupleId: 'couple-1' });
        await setDoc(doc(db, 'couples', 'couple-1'), { id: 'couple-1', memberIds: ['uid-a', 'uid-b'], status: 'active', createdAt: new Date() });
      });

      const uidADb = testEnv.authenticatedContext('uid-a').firestore();
      await assertSucceeds(
        updateDoc(doc(uidADb, 'couples', 'couple-1'), {
          status: 'disconnected',
          disconnectedAt: new Date(),
          disconnectedBy: 'uid-a',
        })
      );
    });

    it('A2: couples.status 임의 값으로 변경 → PERMISSION_DENIED', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'users', 'uid-a'), { id: 'uid-a', displayName: 'A', coupleId: 'couple-1' });
        await setDoc(doc(db, 'couples', 'couple-1'), { id: 'couple-1', memberIds: ['uid-a', 'uid-b'], status: 'active', createdAt: new Date() });
      });

      const uidADb = testEnv.authenticatedContext('uid-a').firestore();
      // 허용 필드 외 변경 시도 (임의 status + 불필요한 extra 필드)
      await assertFails(
        updateDoc(doc(uidADb, 'couples', 'couple-1'), { status: 'hacked' })
      );
    });

    it('A2: couples 허용 안 된 필드(memberIds) 변경 → PERMISSION_DENIED', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'users', 'uid-a'), { id: 'uid-a', displayName: 'A', coupleId: 'couple-1' });
        await setDoc(doc(db, 'couples', 'couple-1'), { id: 'couple-1', memberIds: ['uid-a', 'uid-b'], status: 'active', createdAt: new Date() });
      });

      const uidADb = testEnv.authenticatedContext('uid-a').firestore();
      await assertFails(
        updateDoc(doc(uidADb, 'couples', 'couple-1'), { memberIds: ['uid-a', 'uid-evil'] })
      );
    });

    // ─── A3: invitations delete 발급자/join 멤버만 허용 ───────────────────────

    it('A3: 코드를 아는 제3자가 invitation 삭제 → PERMISSION_DENIED', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'invitations', 'XYZ999'), {
          coupleId: 'couple-1',
          createdBy: 'uid-a',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86_400_000),
        });
        // couple-1은 uid-a 단독 (join 대기 중) — uid-evil은 멤버 아님
        await setDoc(doc(db, 'couples', 'couple-1'), { id: 'couple-1', memberIds: ['uid-a'], status: 'active', createdAt: new Date() });
      });

      const evilDb = testEnv.authenticatedContext('uid-evil').firestore();
      await assertFails(deleteDoc(doc(evilDb, 'invitations', 'XYZ999')));
    });

    // ─── 채팅 메시지 rules ────────────────────────────────────────────────────

    it('[BR-2] 타인 senderId로 메시지 생성 → PERMISSION_DENIED', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'users', 'uid-a'), { id: 'uid-a', displayName: 'A', coupleId: 'couple-1' });
        await setDoc(doc(db, 'couples', 'couple-1'), { id: 'couple-1', memberIds: ['uid-a', 'uid-b'], status: 'active', createdAt: new Date() });
      });

      const uidADb = testEnv.authenticatedContext('uid-a').firestore();
      await assertFails(
        addDoc(collection(uidADb, 'couples', 'couple-1', 'messages'), {
          senderId:  'uid-evil',   // 본인 uid-a 가 아닌 타인
          text:      '위조 메시지',
          createdAt: new Date(),
        })
      );
    });

    it('[BR-2] 본인 senderId로 메시지 생성 → 허용', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'users', 'uid-a'), { id: 'uid-a', displayName: 'A', coupleId: 'couple-1' });
        await setDoc(doc(db, 'couples', 'couple-1'), { id: 'couple-1', memberIds: ['uid-a', 'uid-b'], status: 'active', createdAt: new Date() });
      });

      const uidADb = testEnv.authenticatedContext('uid-a').firestore();
      await assertSucceeds(
        addDoc(collection(uidADb, 'couples', 'couple-1', 'messages'), {
          senderId:  'uid-a',
          text:      '정상 메시지',
          createdAt: new Date(),
        })
      );
    });

    it('[BR-4] text·imageUrl 모두 없으면 rules 거부', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'users', 'uid-a'), { id: 'uid-a', displayName: 'A', coupleId: 'couple-1' });
        await setDoc(doc(db, 'couples', 'couple-1'), { id: 'couple-1', memberIds: ['uid-a', 'uid-b'], status: 'active', createdAt: new Date() });
      });

      const uidADb = testEnv.authenticatedContext('uid-a').firestore();
      await assertFails(
        addDoc(collection(uidADb, 'couples', 'couple-1', 'messages'), {
          senderId:  'uid-a',
          text:      '',           // 빈 텍스트 + imageUrl 없음
          createdAt: new Date(),
        })
      );
    });

    it('[BR-4] 빈 text + imageUrl 있으면 허용', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'users', 'uid-a'), { id: 'uid-a', displayName: 'A', coupleId: 'couple-1' });
        await setDoc(doc(db, 'couples', 'couple-1'), { id: 'couple-1', memberIds: ['uid-a', 'uid-b'], status: 'active', createdAt: new Date() });
      });

      const uidADb = testEnv.authenticatedContext('uid-a').firestore();
      await assertSucceeds(
        addDoc(collection(uidADb, 'couples', 'couple-1', 'messages'), {
          senderId:  'uid-a',
          text:      '',
          imageUrl:  'https://storage.example.com/img.jpg',
          createdAt: new Date(),
        })
      );
    });

    it('[BR-7] 메시지 update → PERMISSION_DENIED', async () => {
      let msgId: string;
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'users', 'uid-a'), { id: 'uid-a', displayName: 'A', coupleId: 'couple-1' });
        await setDoc(doc(db, 'couples', 'couple-1'), { id: 'couple-1', memberIds: ['uid-a', 'uid-b'], status: 'active', createdAt: new Date() });
        const ref = doc(collection(db, 'couples', 'couple-1', 'messages'));
        msgId = ref.id;
        await setDoc(ref, { senderId: 'uid-a', text: '원본', createdAt: new Date() });
      });

      const uidADb = testEnv.authenticatedContext('uid-a').firestore();
      await assertFails(
        updateDoc(doc(uidADb, 'couples', 'couple-1', 'messages', msgId!), { text: '수정 시도' })
      );
    });

    it('[BR-7] 메시지 delete → PERMISSION_DENIED', async () => {
      let msgId: string;
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'users', 'uid-a'), { id: 'uid-a', displayName: 'A', coupleId: 'couple-1' });
        await setDoc(doc(db, 'couples', 'couple-1'), { id: 'couple-1', memberIds: ['uid-a', 'uid-b'], status: 'active', createdAt: new Date() });
        const ref = doc(collection(db, 'couples', 'couple-1', 'messages'));
        msgId = ref.id;
        await setDoc(ref, { senderId: 'uid-a', text: '삭제 대상', createdAt: new Date() });
      });

      const uidADb = testEnv.authenticatedContext('uid-a').firestore();
      await assertFails(
        deleteDoc(doc(uidADb, 'couples', 'couple-1', 'messages', msgId!))
      );
    });

    it('A3: 발급자 본인 invitation 삭제 → 허용', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'users', 'uid-a'), { id: 'uid-a', displayName: 'A', coupleId: 'couple-1' });
        await setDoc(doc(db, 'invitations', 'ABC111'), {
          coupleId: 'couple-1',
          createdBy: 'uid-a',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86_400_000),
        });
        await setDoc(doc(db, 'couples', 'couple-1'), { id: 'couple-1', memberIds: ['uid-a'], status: 'active', createdAt: new Date() });
      });

      const uidADb = testEnv.authenticatedContext('uid-a').firestore();
      await assertSucceeds(deleteDoc(doc(uidADb, 'invitations', 'ABC111')));
    });
  });
}

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  test.skip('⏭ integration: FIRESTORE_EMULATOR_HOST 환경변수 없음', () => {});
}

export {};
