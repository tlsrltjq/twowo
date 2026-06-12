# 프론트엔드 룰북 (FRONTEND_RULES)

> **체크 가능한 한 줄 규칙만** 둔다. 코드 예시·전체 표·결정 사유는 디테일 문서에.
> 디테일: `docs/_archive/frontend.md`(패턴/코드) · `docs/_archive/design-system.md`(토큰/컴포넌트) · `docs/decisions.md`(ADR).
> 충돌 시 이 룰북이 디테일 문서보다 우선 (CLAUDE.md SSOT 순서).

## 디자인 / 토큰
- 색·간격·타이포·radius·shadow 는 **`design-system/tokens.ts` 만**. 직접 `'#FFFBF7'`·`padding:16`·`fontSize:14` 금지.
- 새 토큰 필요 시 `docs/_archive/design-system.md` 표 갱신 → 코드 추가 순서.
- 아이콘은 `lucide-react-native` 만 (ADR-013). 1차 릴리즈 라이트 모드 전용 (ADR-010).
- 폰트 Pretendard 4종, 굵기까지 `typography.*` 토큰에 묶임 (ADR-011).
  → 토큰값·컴포넌트 props·아이콘 매핑·햅틱/애니메이션 표: **`docs/_archive/design-system.md`**

## 화면 필수 — 4가지 UI 상태
- 모든 화면이 **로딩 / 정상 / 빈 / 에러** 4개 모두 처리. 빠뜨리면 PR 거부.
- 첫 진입 로딩 = `Skeleton`, 액션 로딩 = `Spinner`/버튼 `loading`, 빈·오류 = `EmptyState`.
  → 컴포넌트 시그니처·권한 거부 처리: **`docs/_archive/frontend.md` 로딩/에러/빈 상태 표**
- **레이아웃은 즉흥 금지** → 해당 스펙(`docs/specs/*.md`)의 "와이어프레임" 섹션을 따른다. 와이어프레임이 레이아웃 진실 소스.

## 네비게이션 (Expo Router)
- `(auth)` ↔ `(tabs)` 상호배타. `app/index.tsx` 가 auth+coupleId 로 분기.
- 이벤트 생성 = modal, 상세 = push. 실험실 OFF feature 탭은 `(tabs)/_layout.tsx` 에서 redirect.
- 에러 바운더리 2단: `app/_layout.tsx`(치명) + `(tabs)/_layout.tsx`(탭 격리).
  → 전체 라우트 트리·진입 분기 코드: **`docs/_archive/frontend.md` 네비게이션 구조**

## 폼
- `react-hook-form` + `zod` 강제 (ADR-012). 스키마는 `core/{도메인}/schema.ts`.
- BR-* 의 길이/포맷 제한은 zod 로 이중 강제. 폼 화면은 `<KeyboardAware>` 래퍼 필수.
  → 코드 예시: **`docs/_archive/frontend.md` 폼 처리**

## 데이터 페칭 / 상태
- Firestore 직접 `onSnapshot` 금지 → `core/firestore-hooks/` 의 `useFirestoreDoc`/`useFirestoreQuery` 만 (ADR-014).
- 같은 화면에서 같은 쿼리 중복 구독 금지 → 부모에서 한 번 구독, props 하향.
- Zustand store **4개만** (`auth`/`couple`/`ui`/`feature`). 서버 상태 store 저장 금지. 새 store 추가 전 사용자 확인.
  → 훅 코드·store 책임/영속화 표: **`docs/_archive/frontend.md` 데이터 페칭 훅 / Zustand**

## 인터랙션
- 낙관적 업데이트 = **토글류만** (컨디션/빙고/실험실). 이벤트 CRUD·사진 업로드·둘다좋아 투표는 NO.
- 모든 리스트 화면 `RefreshControl` 필수 (onRefresh = 캐시 무효화 + 강제 재구독).
- 햅틱: 공통 컴포넌트가 자동 호출. 직접 호출은 의미 있는 성공만(빙고 라인/매칭/저장). 스크롤·입력 중 금지.
- 애니메이션: 마이크로(≤200ms) = Reanimated, 큰 축하 = Lottie 1회. 입력 막는 애니메이션 금지.
  → 낙관적/햅틱/애니메이션 상세 표: **`docs/_archive/frontend.md` · `docs/_archive/design-system.md`**

## 권한 / 오프라인 / 텍스트 / 로그
- 권한: 시스템 다이얼로그 직행 금지 → rationale 먼저 설명. 거부 시 자동 재요청 X, "설정 열기" CTA 1회.
- 오프라인: `@react-native-community/netinfo` 감지 + 상단 슬림 배너. 읽기는 Firestore 캐시로 안 멈춤.
- 텍스트: 1차 한국어만, i18n 라이브러리 미사용 (도입 시 ADR 추가).
- 로그: debug용 `console.log`/`console.warn` 은 `__DEV__` 가드 필수. `console.error` 는 catch 블록 한정으로 가드 없이 허용 — Sentry 가 프로덕션 에러 로그를 캡처한다.
  → 권한 rationale 문구 표·라우팅 가드 패턴: **`docs/_archive/frontend.md`**

## 자동 점검 (PR/커밋 전 grep)
- [ ] 직접 HEX/숫자 (토큰 우회) 없음
- [ ] 4가지 UI 상태 누락 없음
- [ ] `onSnapshot` 직접 호출 없음
- [ ] `features/` 끼리 직접 import 없음
