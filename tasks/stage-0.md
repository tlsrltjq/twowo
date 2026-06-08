# 0단계 작업 컨텍스트 — 프로젝트 초기 세팅

## 지금 단계: 0단계 — 프로젝트 초기 세팅

## 목표
- [ ] Expo 프로젝트 초기화 (`npx create-expo-app`)
- [ ] TypeScript 템플릿 사용, Expo Router 활성화
- [ ] Firebase 프로젝트 연결 (Firestore, Auth, Storage)
- [ ] `firebase init firestore storage` — 기존 `firestore.rules`, `storage.rules`, `firebase.json` 유지 (덮어쓰기 금지)
- [ ] HARNESS.md 기준 폴더 구조 생성 (`app/`, `core/`, `features/`, `feature-registry/`, `design-system/`, `hooks/`)
- [ ] `feature-registry/types.ts` — `AppFeature` 타입 정의
- [ ] `feature-registry/registry.ts` — 빈 배열로 초기화
- [ ] `core/utils/date.ts` — `getTodayKST()`, `nowKST()` 유틸 (ADR-009)
- [ ] `core/stores/` 디렉토리 생성 (공유 Zustand store 자리, 비어 있어도 OK)
- [ ] `design-system/tokens.ts` — 색상/타이포/간격/radius/shadow 토큰 (`docs/design-system.md` 표 그대로)
- [ ] `design-system/` 공통 컴포넌트 뼈대 — `Button`, `Card`, `TextField`, `Spinner`, `Skeleton`, `EmptyState`, `Toast` (각 파일에 props 인터페이스만 먼저)
- [ ] Pretendard 폰트 파일 `assets/fonts/` 추가 (4종) + `app/_layout.tsx` 에서 `useFonts` 로드 (ADR-011)
- [ ] `tsconfig.json` strict 모드 ON (`docs/dev-environment.md` 의 내용)
- [ ] `.eslintrc.json`, `.prettierrc` 적용 (이미 생성됨, 덮어쓰기 금지)
- [ ] `.env` 작성 (`.env.example` 복사 후 사람이 값 채움)
- [ ] `app.json` 의 `name`, `scheme`, `splash.backgroundColor`, `orientation: portrait` 설정
- [ ] `core/firestore-hooks/` — `useFirestoreDoc`, `useFirestoreQuery` 작성 (ADR-014)
- [ ] `.env.example` 작성 (Firebase 키 placeholder)
- [ ] 앱이 iPhone 시뮬레이터에서 에러 없이 실행

## 완료 기준
- `npx expo start` 실행 시 에러 없음
- 콘솔에 `Firebase initialized` 출력 확인
- `feature-registry/` 폴더에 `types.ts`, `registry.ts` 생성됨
- `firebase deploy --only firestore:rules,storage` 가 dry-run 으로 통과 (실배포는 1단계에서)

## 사용할 패키지 (확인 없이 설치 가능)
- `firebase` (v10+)
- `expo-router`, `expo-font`, `expo-haptics`, `expo-image-manipulator`, `expo-image-picker`, `expo-camera`, `expo-notifications`, `expo-auth-session`
- `zustand`
- `@react-native-async-storage/async-storage`
- `expo-sqlite`
- `react-hook-form`, `zod`, `@hookform/resolvers` (ADR-012)
- `lucide-react-native` (ADR-013)
- `react-native-reanimated`, `lottie-react-native`
- `@react-native-community/netinfo`
- 개발용: `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint-config-expo`, `eslint-plugin-import`, `eslint-plugin-simple-import-sort`, `prettier`, `eslint-config-prettier`

## 건드리면 안 되는 파일
- `firestore.rules`, `storage.rules`, `firebase.json`, `firestore.indexes.json` (이미 작성됨 — `firebase init` 시 덮어쓰기 금지)
- `.eslintrc.json`, `.prettierrc`, `.env.example`, `eas.json` (이미 작성됨 — Expo 가 생성하려고 하면 기존 유지)
- `.env` (없으면 `.env.example` 참고해 새로 만들 것, 값은 사람이 채움)

## 다음 단계 예고
1단계: Firebase Auth 로그인 + 커플 초대 코드(`invitations` 컬렉션) + Security Rules 배포
