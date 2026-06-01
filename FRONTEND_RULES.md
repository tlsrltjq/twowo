# 프론트엔드 룰북 (FRONTEND_RULES)

> AI 가 매번 빠르게 참고하는 **룰북**. 디테일은 `docs/frontend.md` + `docs/design-system.md` 참조.

## 디자인 토큰 — 직접 값 금지
- 색상/간격/타이포/radius/shadow 는 **반드시** `design-system/tokens.ts` 에서.
- 직접 `'#FFFBF7'`, `padding: 16`, `fontSize: 14` 금지. → `bg.base`, `space.4`, `typography.caption`.
- 새 토큰이 필요하면 `docs/design-system.md` 표 갱신 후 코드 추가.

## 폰트
- Pretendard 4종 (Regular/Medium/SemiBold/Bold). `expo-font` 로 0단계에서 로드.
- 토큰의 `typography.*` 가 굵기까지 묶음.

## 다크모드
- 1차 릴리즈는 **라이트 전용** (ADR-010). 단 색상은 모두 토큰만 사용 → 추후 다크 토큰 추가만으로 확장 가능.

## 네비게이션 (Expo Router)
```
app/
├── _layout.tsx           # 앱 루트 (Provider + 전역 ErrorBoundary)
├── index.tsx             # auth + coupleId 분기
├── (auth)/               # 비로그인/연결 전
├── (tabs)/               # 메인. _layout 에 ErrorBoundary
├── event/[id], event/new
├── disconnected.tsx
└── +not-found.tsx
```
- `(auth)` 와 `(tabs)` 상호배타. `app/index.tsx` 가 분기.
- 이벤트 생성 = modal, 상세 = push.
- 실험실 OFF 인 feature 탭은 `(tabs)/_layout.tsx` 에서 redirect.

## 4가지 UI 상태 — 모든 화면 필수
| 상태 | 컴포넌트 |
|------|----------|
| 첫 진입 로딩 | `<Skeleton>` |
| 액션 로딩 | `<Spinner inline>` 또는 버튼 내 `loading` |
| 빈 상태 | `<EmptyState icon title description action?>` |
| 네트워크 오류 | `<EmptyState icon=WifiOff title=... action={재시도}>` |

> 빠뜨리면 PR 거부. 자동 점검 항목.

## 폼
- `react-hook-form` + `zod` 강제 (ADR-012).
- 도메인별 스키마는 `core/{도메인}/schema.ts`.
- BR-* 의 길이/포맷 제한은 zod 로 강제 (이중 검증).
- 폼 화면은 `<KeyboardAware>` 래퍼 필수.

## 데이터 페칭 — 직접 onSnapshot 금지
- `core/firestore-hooks/` 의 `useFirestoreDoc<T>(ref)`, `useFirestoreQuery<T>(query)` 만 사용 (ADR-014).
- 같은 화면에서 같은 쿼리 여러 번 → 부모에서 한 번만 구독 → props 로 내려보내기.
- React Query / SWR 도입 안 함.

## Zustand store — 4개만
```
core/stores/
├── auth.store.ts      # uid, idToken — AsyncStorage 영속화 (uid 만)
├── couple.store.ts    # coupleId, memberIds, status — AsyncStorage 영속화
├── ui.store.ts        # 토스트 큐, 모달 상태 — 영속화 X
└── feature.store.ts   # featureSettings 캐시 — 영속화 X
```
- store 에 *서버 상태* 직접 저장 금지. 서버 상태는 Firestore 훅 책임.
- 새 store 추가 전에 사용자 확인.

## 낙관적 업데이트 — 토글류만
| 액션 | 낙관적? |
|------|:------:|
| 컨디션 / 빙고 / 실험실 토글 | YES |
| 이벤트 CRUD | NO (버튼 → 스피너) |
| 사진 업로드 | NO (진행률) |
| 둘다좋아 투표 | NO (트랜잭션) |

## Pull to refresh
- 모든 리스트 화면에 `RefreshControl` 필수.
- onRefresh = 캐시 무효화 + 강제 재구독.

## 권한 안내 UX — rationale 먼저
- 시스템 다이얼로그를 곧바로 띄우지 않음.
- *사용 직전* 의미가 있는 시점에 rationale 화면/카드로 설명 후 시스템 요청.
- 거부 시 자동 재요청 X, "설정 앱 열기" CTA 한 번만.

## 햅틱
- 공통 컴포넌트가 자동 호출 (Button 탭, BottomSheet 닫기).
- *의미 있는 성공* 만 직접 호출 — 빙고 라인, 매칭 성공, 저장 완료.
- 스크롤/입력 중 호출 금지.

## 아이콘
- `lucide-react-native` 만 사용 (ADR-013).
- 매핑은 `docs/design-system.md` 표 참고. 새 매핑 필요 시 표 갱신.

## 애니메이션
- 마이크로(200ms 이하) 인터랙션 = Reanimated 3.
- 큰 축하(매칭 성공) = Lottie 1회 재생.
- 입력을 막는 애니메이션 금지.

## 에러 바운더리 — 2단
1. `app/_layout.tsx` 최상단 (치명적: Firebase init 실패 등)
2. `(tabs)/_layout.tsx` 안 (한 탭이 죽어도 다른 탭은 살아있게)

## 텍스트
- 1차는 한국어만. i18n 라이브러리 미사용.
- 직접 string. 다국어 시점에 ADR 추가 후 도입.

## 오프라인 / 동기화 배너
- `@react-native-community/netinfo` 로 감지.
- 상단 슬림 배너 — "오프라인이에요 · 변경사항은 복귀 시 동기화됩니다".
- Firestore 캐시가 알아서 처리하므로 *읽기는 멈추지 않음*.

## 디버그 로그
- 개발: `console.log` 자유, 단 `__DEV__` 가드 안에서만.
- 프로덕션: babel-plugin 으로 `console.*` 제거.

## 자동 점검 (PR 시 확인)
- 직접 HEX/숫자 사용 여부 grep
- 4가지 UI 상태 누락 여부
- `onSnapshot` 직접 호출 여부
- features 간 직접 import 여부
