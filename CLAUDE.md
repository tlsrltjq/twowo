# CLAUDE.md
# 세션 시작 시 자동 로딩. 다른 모든 규칙의 진입점.

## 진실 소스 (SSOT)
| 정보 | 파일 |
|------|------|
| 지금 어느 단계, 어디서 멈췄나 | `tasks/current.md` |
| 단계별 목표/완료 기준 (수정 거의 X) | `tasks/stage-N.md` |
| 기능별 동작 명세 (BR-*) | `docs/specs/*.md` |
| 데이터 모델 | `docs/architecture.md` |
| 보안 규칙 | `firestore.rules`, `storage.rules` |
| 기술 결정 사유 | `docs/decisions.md` (ADR) |
| 프론트엔드 룰북 | `FRONTEND_RULES.md` |
| 테스트 룰북 | `TEST_STRATEGY.md` |
| 새 기능 추가 양식 | `FEATURE_SPEC_TEMPLATE.md` |
| 변경 이력 | `CHANGELOG.md` |

충돌 시 위 순서대로 우선. 디테일 참고는 `docs/frontend.md`, `docs/testing.md`, `docs/design-system.md`, `docs/dev-environment.md`.

## 세션 시작 (3줄)
1. HARNESS.md → `tasks/current.md` → 현재 단계의 `tasks/stage-N.md` 읽기
2. "현재 단계: X / 목표: Y / 멈춘 곳: Z" 한 줄 요약 출력
3. 작업 시작

## 자동 진행 vs 사람 확인
**기본은 자동 진행**. 아래 동작만 사용자에게 확인 후 진행:
- `.env` 변경 / 새 환경 변수 추가
- `core/couple/` 로직 변경 (coupleId 데이터 안전성)
- `firestore.rules` / `storage.rules` 의 `allow ... if false` 라인 변경
- `feature-registry/types.ts` 구조 변경
- 새 패키지 설치 (`stage-N.md` 에 명시 안 된 것)
- `git push` / `git rebase` / `git reset --hard`
- 외부 서비스 계정/키 발급

그 외는 멈추지 않고 진행. 완료 후 결과 보고.

## 코딩 룰 (핵심만)
- 데이터 모델은 `architecture.md`, 동작 명세는 `specs/*.md` 의 BR-* 를 반드시 반영.
- 새 feature 폴더명 = `featureId` = **kebab-case 영문**. 짓기 전에 `architecture.md` 의 "Feature 명명/레지스트리 매핑" 표에 먼저 등록 (즉흥 작명 금지).
- 새 컬렉션 추가 시 `firestore.rules` 매칭 블록 반드시 추가 (없으면 기본 `match /{document=**}` 가 차단).
- 새 BR-* 추가 시 해당 스펙의 BR↔테스트 매핑 표 + 테스트를 같은 커밋에 (빈 행 금지).
  - 단 `experimental` feature 는 테스트 완화 적용 (TEST_STRATEGY "단계적 엄격도"). `active` 승격 시 매핑 표 완성 필수. `core/*` 는 완화 없음.
- **프론트엔드 규칙**(토큰/onSnapshot/폼/UI 4상태/features 격리 등)은 `FRONTEND_RULES.md` 가 진실 소스.
- **테스트 규칙**(강제 매트릭스/명명/작성 시점)은 `TEST_STRATEGY.md` 가 진실 소스.

## 커밋 규칙
- **작업 단위 끝나면 자동 커밋**. 단위 = `stage-N.md` 체크박스 1개 이상 / 새 모듈 동작 가능 / 버그 1건 / 문서 변경 1건.
- **커밋 전 자동 검증** (실패 시 멈춤):
  - `npx tsc --noEmit`
  - 변경된 모듈의 `jest --findRelatedTests` (core/* 수정 시)
  - 문서/하네스만 변경한 경우 생략
- **메시지 형식**: `<type>(<scope>): <설명>` (type: feat/fix/chore/docs/test/refactor)
- **자동 push 금지**. push 는 사람이 직접.
- 세션 종료 시 미커밋 0건. 어중간하면 `chore(wip): ...`.

## 워크플로 (체크리스트)

### 새 기능 추가
1. `FEATURE_SPEC_TEMPLATE.md` 복사 → `docs/specs/{name}.md` 채우기 (모든 섹션)
2. 데이터 모델 변경 있으면 `architecture.md`, 보안 규칙 변경은 `firestore.rules`
3. 구현 — `features/{name}/`, registry 등록(`status: 'experimental'`), `FRONTEND_RULES.md` 따름
4. 테스트 — `TEST_STRATEGY.md` 강제 매트릭스 + BR↔테스트 매핑 표 동시 채움
5. 자동 커밋 + `CHANGELOG.md` 한 줄

### 버그 수정
1. 재현 회귀 테스트 1개 추가 (수정 전에는 실패 확인)
2. 수정
3. 회귀 테스트 통과 + 관련 테스트 모두 통과
4. `fix(<scope>): ...` 커밋 + CHANGELOG

### 단계 완료
1. `stage-N.md` 완료 기준 모두 ✅
2. 모든 BR-* 가 매핑 표에 채워졌는지 확인
3. `current.md` 다음 단계로 전환
4. `HARNESS.md` 로드맵 아이콘 갱신 제안 (사용자 OK 시 적용)

### 세션 종료
1. `current.md` "이전 세션 멈춘 곳" 업데이트
2. 미커밋 변경 0건이 되도록 자동 커밋 (어중간하면 `chore(wip): ...`)
3. `CHANGELOG.md` 한 줄

## 절대 금지
- 빌드/타입/테스트 깨진 상태로 `git commit`
- 위 "자동 진행 vs 사람 확인" 항목을 사용자 동의 없이 실행
- `design-system/tokens.ts` 우회한 직접 HEX/숫자
- `features/` 끼리 직접 import
- `Constants.expoConfig` 비공개 키를 클라이언트에서 접근 (`EXPO_PUBLIC_*` 만)
- 스펙에 BR-* 추가했는데 매핑 표 갱신 없이 커밋
