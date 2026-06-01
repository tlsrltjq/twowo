# 테스트 룰북 (TEST_STRATEGY)

> AI 가 매번 빠르게 참고하는 **룰북**. 디테일은 `docs/testing.md` 참조.

## 강제 매트릭스
| 모듈 | 단위 | 통합 | 컴포넌트 |
|------|:----:|:----:|:--------:|
| `core/couple/` | YES | YES | - |
| `core/storage/` | YES | YES | - |
| `core/calendar/deleteEvent` | YES | YES | - |
| `core/utils/*` (pure 함수) | YES | - | - |
| `core/auth/` | 권장 | YES | - |
| `core/notifications/` | 권장 | - | - |
| `core/firestore-hooks/` | 권장 | YES | - |
| `features/{name}/*` 의 pure 함수 (checkLines 등) | YES | - | - |
| `features/{name}/*` 의 화면/상호작용 | - | - | 선택 |
| `design-system/` | - | - | - |
| `app/(tabs)/*` | - | - | 선택 |

**YES = 같은 커밋에 테스트 없으면 커밋 금지**.

## 위치 / 명명 규약
```
core/couple/createInvite.ts
core/couple/createInvite.test.ts          ← 단위 (옆에)

__tests__/integration/couple-join-flow.test.ts   ← 통합
__tests__/integration/security-rules.test.ts     ← Rules 검증

features/couple-bingo/checkLines.test.ts         ← pure 함수 단위
features/couple-bingo/BingoGrid.test.tsx         ← (선택) 컴포넌트
```

- 파일명: `<대상>.test.ts(x)`
- describe: 대상 이름 그대로 — `describe('createInvite', ...)`
- it: `'[BR-N] 동사 + 결과'` — 예: `'[BR-4] 만료된 코드 거부'`

## 작성 시점
1. **기능 같이**: 새 모듈/함수 동작 가능 상태가 되면 *같은 커밋에* 단위 테스트 최소 1개 (정상 케이스 + BR 매핑 표의 핵심).
2. **버그 수정**: 재발 방지 회귀 테스트 1개 반드시 추가. 수정 전에는 실패, 수정 후 통과.
3. **TDD 강제 X**: 한 PR/커밋 안에 있으면 OK. 다만 통합은 기능 직후 — 미루면 부담 폭증.

## 양식 (Arrange / Act / Assert)
```ts
it('[BR-5] 양쪽 투표 완료 시 status=revealed 전이', async () => {
  // Arrange
  const sessionId = await startSession(coupleId);
  await castVote(sessionId, 'A', 'cand-1');

  // Act
  await castVote(sessionId, 'B', 'cand-2');

  // Assert
  const sess = await getDoc(doc(voteSessions, sessionId));
  expect(sess.data()?.status).toBe('revealed');
  expect(sess.data()?.revealedAt).toBeDefined();
});
```

- 한 it 안에서 *상태 + 부작용* 둘 다 검증.
- Arrange 가 5줄 넘으면 `__tests__/fixtures/` 로 추출.
- `expect.anything()` 남용 금지.

## 모킹 / 에뮬레이터

### 단위 — `__mocks__/firebase.ts` (자동 로딩)
- in-memory store + jest.fn 으로 Firestore API 흉내.
- 트랜잭션은 단순화됨 → ACID 검증이 필요하면 통합 테스트로.

### 통합 — Firebase Local Emulator Suite
```bash
firebase emulators:start --only firestore,storage
# 환경변수
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199
```
- 각 테스트 후 컬렉션 비움 (jest.setup.ts).
- Security Rules 도 자동 적용 → 권한 테스트 가능.

## BR ↔ 테스트 매핑 (필수)
모든 스펙(`docs/specs/*.md`) 끝에 매핑 표.
- 새 BR-N 추가 시 매핑 표에 동시 추가 — 빈 행 금지.
- 테스트 it 설명에 `[BR-N]` 명시 → grep 으로 추적 가능.

## 커버리지 정책
- 정량 % 강제 **안 함**. 참고용으로만 출력.
- 단, YES 모듈에서 80% 미만이면 누락된 BR 신호 → 매핑 표 점검.

## CI (`.github/workflows/ci.yml`)
1. `tsc --noEmit`
2. `eslint . --max-warnings=0`
3. `jest` (단위, mock)
4. `firebase emulators:exec ... jest --testPathPattern=__tests__/integration` (통합)

실패하면 머지 차단. main 브랜치만 보호.

## 회귀 테스트 정책
- 버그 수정 PR 은 *반드시* 회귀 테스트 1개 포함.
- 이름: `regression-<짧은 설명>.test.ts` 또는 기존 파일 안 `describe('[regression] ...')`.

## 무엇을 안 하나
- Detox / Maestro E2E 자동화 → 수동 `qa-checklist.md` 로 대체.
- 커버리지 % 목표 (80% 등) → 부담만 키움.
- 시각 회귀 / 변이 / 성능 자동 테스트 → 출시 후 재검토.

## package.json 스크립트
```json
{
  "test": "jest",
  "test:integration": "FIRESTORE_EMULATOR_HOST=localhost:8080 jest --testPathPattern=__tests__/integration",
  "test:all": "jest && npm run test:integration",
  "typecheck": "tsc --noEmit",
  "lint": "eslint . --max-warnings=0"
}
```
