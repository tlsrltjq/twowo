# 테스트 전략

> **이 문서는 참고용 디테일**. AI 가 자동 작업 시 매번 읽는 룰북은 `TEST_STRATEGY.md`.
> 여기는 *왜 그렇게 결정했는지* / *깊은 디테일이 필요할 때* 만 참고.


> 무엇을 / 어떻게 / 어디에 / 언제 테스트할지 단일 진실 소스.
> 정책 한 줄(`CLAUDE.md` 의 "테스트 정책") 을 실무 수준으로 풀어쓴 문서.

## 결정 요약 (ADR-015 참조)
- **단위 테스트**: Jest + jest-expo preset. 강제 대상은 `core/*` 의 데이터 무결성 중요 모듈.
- **통합 테스트**: Firebase Local Emulator Suite (Firestore + Storage). `__tests__/integration/`.
- **컴포넌트 테스트**: `@testing-library/react-native`. 강제 X, 복잡한 상호작용 화면만 선택적.
- **E2E**: Detox/Maestro 자동화 안 함. **수동 체크리스트**(`docs/qa-checklist.md`)로 대체.
- **CI**: GitHub Actions — push/PR 시 `tsc + eslint + jest` 자동 실행.
- **커버리지 % 강제 안 함**. 참고용으로만 출력. 둘만 쓰는 앱에서 정량 강제는 부담만 키움.

---

## 테스트 분류

### 1) 단위 테스트 (Unit) — 빠르고 자주
- **대상**: pure 함수, util, 단일 모듈 (예: `core/utils/date.ts`, `features/couple-bingo/checkLines.ts`)
- **도구**: Jest (mock 사용)
- **위치**: 코드 옆 `*.test.ts`
- **속도**: 1 파일 50ms 이내. 전체 5초 이내 목표.
- **외부 의존성**: 모두 mock (Firebase, RN 모듈, 네트워크)

### 2) 통합 테스트 (Integration) — Firestore 실제 동작 검증
- **대상**: 트랜잭션, Security Rules, 사진 업로드 + 메타 동기화 같은 "여러 모듈 협업" 코드
- **도구**: Jest + Firebase Local Emulator Suite
- **위치**: `__tests__/integration/*.test.ts`
- **속도**: 1 파일 1~3초. 전체 30초 이내 목표.
- **외부 의존성**: 에뮬레이터 (실제 Firebase 프로젝트 X)

### 3) 컴포넌트 테스트 (선택)
- **대상**: 복잡한 폼 검증, 다단계 모달, 빙고 그리드 상호작용 같은 *상호작용이 풍부한 화면*
- **도구**: `@testing-library/react-native`
- **위치**: 컴포넌트 옆 `*.test.tsx`
- **강제 안 함**: design-system 의 기본 컴포넌트는 시각적이라 수동 점검.

### 4) 수동 E2E — `docs/qa-checklist.md`
- **대상**: 전체 사용자 플로우, 푸시 알림, 사진 권한, 실기기 동작
- **방식**: 시뮬레이터 2개 또는 실기기 2대로 체크리스트 한 줄씩 확인
- **시점**: stage-7 진입 시 1회, TestFlight 빌드 후 1회

---

## 어떤 모듈에 *얼마나* 테스트할지 (강제 매트릭스)

> 강제 매트릭스(어떤 모듈에 단위/통합/컴포넌트 테스트를 강제하는지)는 **룰북 `TEST_STRATEGY.md` 가 단일 진실 소스**. 여기서 중복 보관하지 않는다.

원칙만 (판단 기준):
- "데이터 꼬이면 복구 어려운 모듈" = YES (강제)
- 비즈니스 로직이 들어간 pure 함수 = YES (강제) — 예: `checkLines`, `getTodayKST`
- UI 표현 = 강제 X (수동 점검)

---

## 테스트 파일 위치 / 명명 규약

```
core/couple/
  ├── createInvite.ts
  ├── createInvite.test.ts          ← 단위
  ├── joinByCode.ts
  └── joinByCode.test.ts            ← 단위

__tests__/integration/
  ├── couple-join-flow.test.ts      ← 통합 (3개 모듈 협업)
  ├── photo-upload-delete.test.ts   ← 통합
  └── security-rules.test.ts        ← Rules 검증

features/couple-bingo/
  ├── checkLines.ts
  ├── checkLines.test.ts            ← 순수 함수 단위
  └── BingoGrid.tsx
  └── BingoGrid.test.tsx            ← (선택) 컴포넌트
```

**명명 규약**:
- 파일: `<대상>.test.ts` / `<대상>.test.tsx`
- describe: 대상 이름 그대로 — `describe('createInvite', ...)`
- it: *행위 + 결과* — `it('creates invitation with 24h TTL', ...)` (한글 OK)
- 통합 시나리오: 동사로 시작 — `couple-join-flow.test.ts`, `photo-upload-delete.test.ts`

---

## 테스트 작성 시점 (커밋 규칙과 정합)

`CLAUDE.md` "버전 관리(커밋) 규칙" 의 *"작업 단위가 끝나면 무조건 커밋"* 과 정합:

1. **기능 구현과 동시**: 새 모듈/함수가 동작 가능 상태가 되면, 그 커밋 안에 최소 단위 테스트 1개 포함.
   - 정상 케이스 1개는 필수. 경계/실패 케이스는 BR 매핑 표에 따라 추가.
2. **버그 수정 시**: 반드시 *재발 방지 회귀 테스트 1개 추가*. 이 테스트는 버그 수정 전에는 실패해야 한다.
3. **TDD 강제하지 않음**: 한 PR 안에 있으면 OK. 다만 통합 테스트는 *기능 직후* 작성 (몇 주 미루면 작성 부담만 커짐).

---

## 양식 — Arrange/Act/Assert

```ts
describe('joinByCode', () => {
  it('B가 유효한 코드 입력 → memberIds 2명, invitations 삭제', async () => {
    // Arrange
    const coupleId = await createCoupleWithMember('A_uid');
    const code = await issueInvite(coupleId, 'A_uid');

    // Act
    const result = await joinByCode('B_uid', code);

    // Assert
    expect(result.coupleId).toBe(coupleId);
    const couple = await getDoc(doc(couples, coupleId));
    expect(couple.data()?.memberIds).toEqual(['A_uid', 'B_uid']);
    const inv = await getDoc(doc(invitations, code));
    expect(inv.exists()).toBe(false);
  });

  it('만료된 코드 입력 → JoinError(expired) throw, 데이터 변화 없음', async () => { /* ... */ });
});
```

**규칙**:
- Arrange 단계는 1~5줄 안에 끝나도록 — 길어지면 helper 함수로 추출 (`__tests__/fixtures/`)
- Assert는 *상태 + 부작용* 둘 다 검증 (BR 추적표가 강제)
- `expect.anything()` 남용 금지 — 실제 값 비교

---

## Firebase 모킹 / 에뮬레이터

### 단위 테스트 (mock)
`__mocks__/firebase.ts` 에 표준 mock 시드. Jest 자동 모킹 활성.

```ts
// __mocks__/firebase.ts
export const __mockDb = new Map<string, any>();
export const getDoc = jest.fn(async (ref) => ({
  exists: () => __mockDb.has(ref.path),
  data:   () => __mockDb.get(ref.path),
}));
export const setDoc = jest.fn(async (ref, data) => { __mockDb.set(ref.path, data); });
// ... runTransaction, onSnapshot, serverTimestamp 등
```

### 통합 테스트 (에뮬레이터)
```bash
# 한 번 셋업
firebase init emulators  # Firestore + Storage 선택

# 테스트 전에 백그라운드 기동
firebase emulators:start --only firestore,storage --import=./test-seed --export-on-exit
```

테스트 코드에서 연결:
```ts
import { connectFirestoreEmulator } from 'firebase/firestore';
beforeAll(() => {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    connectFirestoreEmulator(db, 'localhost', 8080);
  }
});
afterEach(async () => {
  // 컬렉션 비우기
  await fetch('http://localhost:8080/emulator/v1/projects/demo/databases/(default)/documents', { method: 'DELETE' });
});
```

**환경 변수 표준**:
- `FIRESTORE_EMULATOR_HOST=localhost:8080`
- `FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199`
- jest setup 파일에서 자동 설정 (`jest.setup.ts`).

---

## 스펙 ↔ 테스트 추적 (BR-X 매핑)

각 스펙 파일(`docs/specs/*.md`) 끝에 **BR ↔ 테스트 매핑 표** 가 있다.
이 표는 *비즈니스 룰이 어느 테스트로 검증되는지* 추적하는 진실 소스.

**규칙**:
- BR 추가/변경 시 → 매핑 표 한 줄 추가. 매핑 안 된 BR 은 미검증 상태로 본다.
- 테스트 작성 시 `it()` 설명에 BR 식별자 명시 권장 — 예: `it('[BR-4] 만료된 코드 거부')`
- 단계 완료 기준에 "그 단계의 모든 BR-X 가 매핑 표에 등록되어 있을 것" 포함.

---

## 커버리지 정책
- 정량 % 목표 **강제하지 않음**.
- `npm test -- --coverage` 출력은 PR 리뷰 보조용으로만 사용.
- 단, *강제 매트릭스 YES* 인 모듈의 커버리지는 90% 이상이 자연스럽게 나오는 게 정상. 80% 아래면 누락된 BR 이 있다는 신호.

---

## CI (GitHub Actions)
`.github/workflows/ci.yml` 시드 작성됨. 트리거:
- push (모든 브랜치)
- pull_request (main 대상)

실행 단계:
1. `npm ci`
2. `npx tsc --noEmit`
3. `npx eslint . --max-warnings=0`
4. `npm test -- --ci`
5. (선택) Firebase 에뮬레이터 띄우고 통합 테스트

실패 시 머지 차단. 둘만 쓰는 앱이라 브랜치 보호 규칙은 선택적.

---

## 회귀 테스트 정책
- **버그 발견 시**: 수정 PR 안에 *그 버그를 재현하는 테스트 1개* 반드시 추가.
  - 이 테스트는 수정 전에는 실패, 수정 후에는 통과해야 한다.
- 이름: `regression-<issue번호 또는 짧은 설명>.test.ts` 또는 기존 테스트의 `describe('[regression] ...')` 블록.

---

## 무엇을 *안* 하나 (지금 시점)

| 항목 | 이유 |
|------|------|
| Detox / Maestro E2E 자동화 | 실기기 셋업 부담 큼. 수동 체크리스트로 충분. |
| 커버리지 % 강제 (80% 등) | 부담만 키우고 실효 작음. |
| 시각 회귀 테스트 (Percy 등) | 둘만 쓰는 앱에서 오버킬. |
| 성능 테스트 (Flipper Perf) | 데이터량 적어 불필요. |
| 자동 접근성 테스트 | 수동 점검 (배포 직전) 으로 충분. |
| 변이 테스트 (mutation) | 오버킬. |

**재검토 시점**: 출시 후 6개월. 사용자 수가 늘거나 안정성 이슈 잦으면 도입 검토.

---

## 자주 쓰는 명령
```bash
npm test                          # 단위만 (mock)
npm test -- --watch
npm test -- --coverage
npm run test:integration          # 에뮬레이터 띄우고 통합
npm run test:all                  # 둘 다
firebase emulators:start --only firestore,storage
```

**package.json scripts 시드 (0단계 또는 1단계에서 추가)**:
```json
{
  "scripts": {
    "test": "jest",
    "test:integration": "FIRESTORE_EMULATOR_HOST=localhost:8080 jest --testPathPattern=__tests__/integration",
    "test:all": "jest && npm run test:integration",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --max-warnings=0"
  }
}
```

---

## 새 BR 추가 시 워크플로 (요약)
1. 스펙(`docs/specs/*.md`) 의 비즈니스 룰 섹션에 `BR-N` 추가
2. 그 BR 을 검증할 테스트 케이스 작성 — `*.test.ts`
3. 매핑 표에 한 줄 추가 (`BR-N | 위치 | 테스트 이름`)
4. CHANGELOG 에 한 줄 (`날짜 | 단계 | feat/test: BR-N 추가 + 테스트`)
5. 같은 커밋에 모두 포함 (커밋 규칙)
