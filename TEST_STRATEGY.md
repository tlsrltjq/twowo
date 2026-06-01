# 테스트 룰북 (TEST_STRATEGY)

> **체크 가능한 규칙 + 강제 매트릭스만** 둔다. 코드 예시·에뮬레이터 셋업·CI 디테일은 `docs/testing.md`.
> 결정 사유는 `docs/decisions.md` ADR-015. 충돌 시 이 룰북이 디테일 문서보다 우선.

## 강제 매트릭스 (단일 진실 소스)
**YES = 같은 커밋에 테스트 없으면 커밋 금지.**

| 모듈 | 단위 | 통합 | 컴포넌트 |
|------|:----:|:----:|:--------:|
| `core/couple/` (invite/join/disconnect) | YES | YES | - |
| `core/storage/` (업로드/삭제/cleanup) | YES | YES | - |
| `core/calendar/deleteEvent` | YES | YES | - |
| `core/calendar/*` (CRUD 나머지) | 권장 | - | - |
| `core/auth/` | 권장 | YES | - |
| `core/notifications/` | 권장 | - | - |
| `core/utils/*` (pure: date/validation/formatter) | YES | - | - |
| `core/firestore-hooks/` | 권장 | YES | - |
| `core/stores/` (Zustand) | 권장 | - | - |
| `features/*` 의 pure 함수 (checkLines 등) | YES | - | - |
| `features/*` 의 화면/상호작용 | - | - | 선택 |
| `design-system/` (시각 컴포넌트) | - | - | - |
| `app/(tabs)/*` 화면 | - | - | 선택 |

원칙: 데이터 꼬이면 복구 어려운 모듈 + 비즈니스 로직 pure 함수 = YES. UI 표현 = 강제 X(수동 점검).

## 위치 / 명명
- 단위: 코드 옆 `<대상>.test.ts(x)`. 통합: `__tests__/integration/<flow>.test.ts`. Rules 검증: `security-rules.test.ts`.
- describe = 대상 이름 그대로. it = `'[BR-N] 동사 + 결과'` (예: `'[BR-4] 만료된 코드 거부'`).
  → AAA 양식·fixtures 추출 기준: **`testing.md` 양식**

## 작성 시점
- 새 모듈 동작 가능 = **같은 커밋에** 단위 테스트 최소 1개 (정상 케이스 + BR 매핑 핵심).
- 버그 수정 = 재현 회귀 테스트 1개 필수 (수정 전 실패 → 후 통과). 이름 `regression-*.test.ts` 또는 `describe('[regression] ...')`.
- TDD 강제 X. 단 통합 테스트는 기능 직후 (미루면 작성 부담 폭증).

## BR ↔ 테스트 매핑 (필수)
- 모든 스펙(`docs/specs/*.md`) 끝에 매핑 표. 새 BR-N 추가 시 같은 커밋에 표 한 줄 + 테스트. 빈 행 금지.
- 매핑 안 된 BR = 미검증. 단계 완료 기준 = 그 단계의 모든 BR 이 매핑 표에 등록됨.

## 모킹 / 에뮬레이터 (요약)
- 단위 = `__mocks__/firebase.ts` in-memory mock (자동 로딩). 트랜잭션 ACID 검증이 필요하면 통합으로.
- 통합 = Firebase Local Emulator (`FIRESTORE_EMULATOR_HOST=localhost:8080`, `FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199`). 각 테스트 후 컬렉션 비움. Security Rules 자동 적용.
  → 시드/연결 코드·명령어: **`testing.md` Firebase 모킹/에뮬레이터**

## 커버리지 / CI / 안 하는 것
- 커버리지 % **강제 안 함** (참고 출력만). YES 모듈이 80% 미만이면 누락 BR 신호 → 매핑 표 점검.
- CI(`.github/workflows/ci.yml`): tsc → eslint → jest(단위) → 에뮬레이터 통합. 실패 시 머지 차단.
- E2E 자동화(Detox/Maestro)·시각 회귀·성능·변이 테스트 = **안 함** (`qa-checklist.md` 수동 대체).
  → 분류별 디테일·package.json scripts·재검토 시점: **`testing.md`**
