/**
 * 통합 테스트: Storage Security Rules 의 커플 멤버십 검증 (ADR-030)
 * 실행: npm run test:integration:local
 *   (firebase.test.json 으로 firestore + storage 에뮬레이터를 함께 띄운다.
 *    storage.rules 의 firestore.get() 이 Firestore 에뮬레이터를 조회한다.)
 *
 * Firestore 문서는 보안 규칙을 끈 상태로 심고, Storage 요청만 규칙으로 평가한다.
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

const PROJECT_ID = process.env.GCLOUD_PROJECT ?? 'demo-coupleapp';
const [fsHost, fsPort] = (process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080').split(':');
const [stHost, stPort] = (process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? 'localhost:9199').split(':');

const COUPLE = 'couple-a';
const OTHER = 'couple-b';
const PHOTO = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
const JPEG = { contentType: 'image/jpeg' };

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: fsHost!, port: Number(fsPort) },
    storage: {
      host: stHost!,
      port: Number(stPort),
      rules: readFileSync(join(__dirname, '../../storage.rules'), 'utf8'),
    },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'couples', COUPLE), { status: 'active', memberIds: ['alice', 'bob'] });
    await setDoc(doc(db, 'couples', OTHER), { status: 'active', memberIds: ['mallory', 'trent'] });
    await ctx.storage().ref(`couples/${COUPLE}/events/e1/p1_thumb.jpg`).put(PHOTO, JPEG);
  });
});

const storageAs = (uid: string) => env.authenticatedContext(uid).storage();

describe('[ADR-030] Storage — 커플 멤버만 접근', () => {
  it('내 커플 경로에 사진을 올릴 수 있다', async () => {
    await assertSucceeds(storageAs('alice').ref(`couples/${COUPLE}/events/e1/p2_original.jpg`).put(PHOTO, JPEG).then());
  });

  it('내 커플 사진을 읽을 수 있다', async () => {
    await assertSucceeds(storageAs('bob').ref(`couples/${COUPLE}/events/e1/p1_thumb.jpg`).getMetadata());
  });

  it('[회귀] 다른 커플 멤버는 coupleId 를 알아도 사진을 읽을 수 없다', async () => {
    await assertFails(storageAs('mallory').ref(`couples/${COUPLE}/events/e1/p1_thumb.jpg`).getMetadata());
  });

  it('[회귀] 다른 커플 멤버는 남의 커플 경로에 올릴 수 없다', async () => {
    await assertFails(storageAs('mallory').ref(`couples/${COUPLE}/food/f1.jpg`).put(PHOTO, JPEG).then());
  });

  it('로그인하지 않으면 접근할 수 없다', async () => {
    await assertFails(env.unauthenticatedContext().storage().ref(`couples/${COUPLE}/events/e1/p1_thumb.jpg`).getMetadata());
  });

  it('이미지가 아닌 파일은 올릴 수 없다', async () => {
    await assertFails(storageAs('alice').ref(`couples/${COUPLE}/chat/x.txt`).put(PHOTO, { contentType: 'text/plain' }).then());
  });
});
