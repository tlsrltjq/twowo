# 현재 작업 컨텍스트 (진행 추적용 — SSOT)

> 이 파일은 **단계 진행 상황의 단일 진실 소스(SSOT)** 입니다.
> 단계별 "계획서"는 `stage-N.md`에 있고 거의 수정되지 않습니다.
> 이 파일은 매 세션마다 자유롭게 갱신됩니다.

## 지금 단계: 0단계 — 프로젝트 초기 세팅
> 상세 계획은 `tasks/stage-0.md` 참고

## 진행 체크 (stage-0.md의 목표를 복사해서 ✅로 마킹)
- ✅ Expo 프로젝트 초기화 (SDK 56, React 19)
- ✅ 폴더 구조 생성 (app/core/features/feature-registry/design-system/hooks/assets)
- ✅ `feature-registry/types.ts`, `registry.ts` 작성
- ✅ `core/utils/date.ts` — `getTodayKST()`, `nowKST()` + 단위 테스트 5종 green
- ✅ `design-system/tokens.ts` — 색상/타이포/간격/radius/shadow
- ✅ `design-system/` 공통 컴포넌트 7종 뼈대 (Button/Card/TextField/Spinner/Skeleton/EmptyState/Toast)
- ✅ `core/firestore-hooks/` — `useFirestoreDoc`, `useFirestoreQuery`
- ✅ `core/config/firebase.ts` — Firebase 초기화 (EXPO_PUBLIC_* 환경변수)
- ✅ `app/_layout.tsx` 진입점 (Pretendard 폰트 로드 구조)
- ✅ `tsconfig.json` strict 모드 ON + paths 설정
- ✅ `babel.config.js`, `app.json` 설정
- ✅ `.env` Firebase 설정값 입력 완료
- ✅ Pretendard 폰트 파일 4종 `assets/fonts/` 추가
- [ ] Firebase 프로젝트 연결 (`firebase login` 후 `firebase use pair-38a4e`)
- [ ] 시뮬레이터 실행 확인 (`npx expo start --ios`) — Xcode 설치 후 사용자가 직접 실행

## 이전 세션에서 멈춘 곳
0단계 세팅 완료. TypeScript 에러 0, 테스트 5/5 green.
시뮬레이터 실행은 Xcode 설치 후 `npx expo start --ios` 로 직접 확인 필요.
Firebase CLI 연결(`firebase login && firebase use pair-38a4e`) 후 1단계 시작.

## 다음 단계 예고
1단계: Firebase Auth **이메일** 로그인(구글은 2차, ADR-018) + 커플 초대 코드 + Security Rules 배포
- 발급 전 `ensureCouple` 로 커플 선생성(auth-couple BR-0)
- 코드 재발급은 `getDocs` + `writeBatch`(트랜잭션 내 쿼리 금지, BR-3)

> **범위 기준: ADR-018** — 1차 MVP 6개(인증·캘린더·컨디션·홈/로컬알림·단순해제·TestFlight 게이트)만 먼저. 투표/빙고/원격푸시/실험실/30일유예/공개출시는 2차.

---
<!-- 새 단계 시작 시 위 내용을 아래 템플릿으로 교체 -->
<!--
## 지금 단계: N단계 — [단계명]
> 상세 계획은 `tasks/stage-N.md` 참고

## 진행 체크
- [ ] (stage-N.md 목표를 복사)

## 이전 세션에서 멈춘 곳
[어디서 멈췄는지, 어떤 파일을 다음에 볼지]

## 다음 단계 예고
[다음에 할 것]
-->
