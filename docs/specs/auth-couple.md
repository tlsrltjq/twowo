# 스펙: 인증 + 커플 연결 (1단계)

> 짝 문서: `tasks/stage-1.md` (작업 항목), `docs/architecture.md` (데이터 모델),
> `firestore.rules` (권한), `docs/decisions.md` ADR-007 (invitations 분리).

## 개요
사용자가 Firebase Auth 로 로그인하고, 두 사람을 하나의 `coupleId` 로 연결하는 단계.
연결되지 않은 사용자는 메인 앱에 진입하지 못한다.

## 사용자 스토리
- **US-1**: 처음 가입한 A는 이메일/구글로 로그인하고, 6자리 초대 코드를 발급받아 B에게 공유한다.
- **US-2**: B는 같은 방식으로 로그인한 뒤 코드를 입력하면 즉시 메인 화면에 진입한다.
- **US-3**: 이미 연결된 사용자는 다음 실행 시 로그인 화면을 건너뛰고 메인으로 간다.
- **US-4**: 잘못된 코드/만료된 코드를 입력하면 명확한 에러 메시지를 본다.

## 화면 흐름
```
앱 실행
  ├── Auth 미인증     → 로그인 화면 (이메일 / 구글)
  └── Auth 인증됨
        ├── users/{uid}.coupleId 있음   → 메인 (탭 화면)
        └── coupleId 없음                → 커플 연결 화면
                                            ├── [코드 생성] → 코드 표시 + 공유
                                            └── [코드 입력] → 검증 → 연결 완료
```

## 와이어프레임 (화면별 레이아웃)
### 로그인 (`(auth)/login.tsx`)
```text
┌─ 둘다좋아 ───────────────────┐
│  [이메일]       (TextField)   │
│  [비밀번호]     (TextField sec)│
│  [로그인]       (Button pri)  │
│  [Google 로 계속](Button sec) │
│  회원가입 → signup            │
│  오류 = 필드 하단 + Toast     │
└──────────────────────────────┘
```
### 커플 연결 (`(auth)/couple-connect.tsx`)
```text
┌─ 커플 연결 ──────────────────┐
│ [내 코드 만들기] (Button pri) │
│   → 코드 "ABC123" 크게 + 복사 │
│      만료 D-1 표시            │
│ ──────  또는  ──────          │
│ [코드 입력]     (TextField)   │
│ [연결하기]      (Button pri)  │
│ 오류: 만료/없음/본인/이미연결  │
│   → 필드 하단 메시지(BR-4~7)  │
│ 로딩 = Button loading         │
└──────────────────────────────┘
```
- 코드 표시 후 공유 시트(Share). 연결 성공 → 햅틱 success → `/(tabs)` replace.

## 비즈니스 룰
- **BR-1**: `users/{uid}` 문서는 로그인 직후 무조건 존재 (없으면 자동 생성, `coupleId: null`).
- **BR-2**: 초대 코드는 6자리 영숫자(`A-Z0-9` 중 대문자만, 가독성 위해 `0OI1` 제외).
- **BR-3**: 같은 사용자가 코드 발급을 반복 요청하면 기존 코드를 무효화하고 새 코드 발급. `invitations` 컬렉션에는 항상 본인 발급 코드 1개만 유효.
- **BR-4**: 초대 코드 TTL = 24시간 (`expiresAt = createdAt + 24h`). 만료된 코드 입력 시 거부.
- **BR-5**: B가 코드 입력 시 트랜잭션으로 ① `couples/{coupleId}.memberIds` 에 본인 추가, ② `users/{B}.coupleId` 설정, ③ `invitations/{code}` 삭제 — 세 작업이 모두 성공해야 연결 완료.
- **BR-6**: 본인이 만든 코드를 본인이 입력하는 시도는 거부 (`createdBy == auth.uid` 이면 에러).
- **BR-7**: 이미 다른 커플에 연결된 사용자(`coupleId != null`)가 새 코드를 입력하는 시도는 거부.
- **BR-8**: 커플 정원은 2명. memberIds.size == 2 인 커플에는 더 추가 불가.

## Edge case
| 상황 | 동작 |
|------|------|
| 네트워크 단절 중 코드 입력 | 트랜잭션 실패 → "다시 시도" 안내, 부분 적용 없음 |
| 24h 지난 코드 입력 | "만료된 코드입니다" 에러 + 발급자에게 새 코드 요청 안내 |
| 코드 자체가 존재하지 않음 | "잘못된 코드입니다" 에러 (오타 가능성 명시) |
| Firebase Auth 로그아웃 후 재로그인 | `users/{uid}.coupleId` 가 있으면 자동 메인 진입 |
| 구글 로그인 취소 | 로그인 화면 그대로, 에러 표시 없음 |
| 동일 이메일로 다른 기기에서 동시 로그인 | Auth 가 처리, 우리는 추가 처리 없음 |
| 앱 강제 종료 후 재실행 | `auth.onAuthStateChanged` + `users/{uid}` 한 번에 조회 후 분기 |

## API 시그니처 (TypeScript)
```ts
// core/auth/
export async function signInWithEmail(email: string, password: string): Promise<User>
export async function signUpWithEmail(email: string, password: string, displayName: string): Promise<User>
export async function signInWithGoogle(): Promise<User>
export async function signOut(): Promise<void>
export function subscribeAuthState(cb: (user: User | null) => void): () => void

// core/couple/
export async function ensureUserDoc(uid: string, displayName: string): Promise<void>
export async function createInvite(uid: string): Promise<{ code: string; expiresAt: Date }>
export async function joinByCode(uid: string, code: string): Promise<{ coupleId: string }>
//   - 트랜잭션 실패 시 throws JoinError({ reason: 'expired' | 'not_found' | 'self' | 'already_joined' | 'couple_full' })
export function subscribeCouple(coupleId: string, cb: (couple: Couple) => void): () => void
```
> 모든 함수 시그니처는 `any` 금지. 에러는 명시적 union 타입으로.

## Firestore 쓰기 패턴
```ts
// 코드 생성
const code = generateCode();                    // 6자리, BR-2
const now = serverTimestamp();
await runTransaction(db, async (tx) => {
  // 1) 기존 본인 코드 무효화
  const prev = await tx.get(query(invitations, where('createdBy', '==', uid)));
  prev.forEach(d => tx.delete(d.ref));
  // 2) 새 코드 생성
  tx.set(doc(invitations, code), {
    coupleId: myCoupleId,                       // 발급 시점에 본인의 coupleId (없으면 새로 생성한 것)
    createdBy: uid,
    createdAt: now,
    expiresAt: Timestamp.fromMillis(Date.now() + 24*3600*1000),
  });
});

// 코드 입력 (B 입장)
await runTransaction(db, async (tx) => {
  const inv = await tx.get(doc(invitations, code));
  if (!inv.exists()) throw new JoinError('not_found');
  const { coupleId, createdBy, expiresAt } = inv.data();
  if (expiresAt.toMillis() < Date.now()) throw new JoinError('expired');
  if (createdBy === uid) throw new JoinError('self');
  const couple = await tx.get(doc(couples, coupleId));
  if (couple.data().memberIds.length >= 2) throw new JoinError('couple_full');
  tx.update(doc(couples, coupleId), { memberIds: [...couple.data().memberIds, uid] });
  tx.update(doc(users, uid), { coupleId });
  tx.delete(doc(invitations, code));
});
```
> `firestore.rules` 의 couples update 규칙(size 1→2, 본인이 두 번째) 과 위 트랜잭션이 정확히 일치해야 함.

## 다른 기능과의 연계
- **2단계 이후 전부**: 모든 coupleId 기반 쿼리는 `core/couple/getCoupleId()` 한 곳에서 가져옴.
- **6단계 (커플 해제)**: 같은 `couples` 문서의 `status: 'disconnected'` 로 전환. 재연결 30일 유예는 6단계에서.
- **8단계 (공개 출시)**: Google 로그인 제공 시 **Sign in with Apple 의무 추가**(ADR-017-2). 인앱 **계정 삭제**(해제와 별개, Cloud Function purge)도 8단계. 신규 BR/매핑은 그때 보강.
- **홈 화면**: 로그인 직후 BR-1 의 `ensureUserDoc` 이 끝난 뒤에만 진입.

## 테스트 (Jest)
- `createInvite`: 기존 코드 무효화 + 새 코드 발급 (트랜잭션 한 번에).
- `joinByCode`: 정상 / 만료 / 본인 코드 / 이미 가입 / 정원 초과 5가지 시나리오.
- Firebase 에뮬레이터 권장 (`firebase emulators:start --only firestore`).

## BR ↔ 테스트 매핑
| BR | 종류 | 위치 | 테스트 이름 |
|----|------|------|-------------|
| BR-1 | 단위 | core/couple/ensureUserDoc.test.ts | '[BR-1] 로그인 직후 users 문서 자동 생성, coupleId=null' |
| BR-2 | 단위 | core/couple/generateCode.test.ts | '[BR-2] 6자리 영숫자(가독성 제외 문자 없음)' |
| BR-3 | 통합 | __tests__/integration/couple-invite-flow.test.ts | '[BR-3] 코드 재발급 시 이전 invitations 무효화' |
| BR-4 | 단위 + 통합 | core/couple/joinByCode.test.ts | '[BR-4] 24h 지난 코드 입력 → JoinError(expired)' |
| BR-5 | 통합 | __tests__/integration/couple-join-flow.test.ts | '[BR-5] join 트랜잭션 3단계 모두 성공/모두 실패' |
| BR-6 | 단위 | core/couple/joinByCode.test.ts | '[BR-6] 본인이 만든 코드 본인 입력 시 JoinError(self)' |
| BR-7 | 단위 | core/couple/joinByCode.test.ts | '[BR-7] 이미 coupleId 있는 사용자 거부 → JoinError(already_joined)' |
| BR-8 | 단위 | core/couple/joinByCode.test.ts | '[BR-8] memberIds.size==2 시 JoinError(couple_full)' |
| 권한 | 통합 | __tests__/integration/security-rules.test.ts | '비멤버가 couples 문서 get → PERMISSION_DENIED' |
