# 현재 작업 컨텍스트 (진행 추적용 — SSOT)

> 이 파일은 **단계 진행 상황의 단일 진실 소스(SSOT)** 입니다.
> 단계별 "계획서"는 `stage-N.md`에 있고 거의 수정되지 않습니다.
> 이 파일은 매 세션마다 자유롭게 갱신됩니다.

## 지금 단계: 7단계 — 마무리 + 배포
> 상세 계획은 `tasks/stage-7.md` 참고 (ADR-018 1차 MVP 마지막 단계)

## 5단계 완료 기록
- ✅ app/(tabs)/settings.tsx — 커플 정보/닉네임/기념일/로그아웃/커플 해제 UI
- ✅ core/couple/disconnect.ts — disconnectCouple / reconnectCouple (BR-D1/D4)
- ✅ app/_layout.tsx — couples.status 구독 → disconnected 감지 시 setCoupleId(null) (BR-D2)
- ✅ core/notifications/ — 권한+Push Token+로컬 알림 스케줄 (BR-4/5/6)
- ✅ 단위 테스트 3종 green (disconnect.test.ts BR-D1/D4)
- ✅ tsc --noEmit 0 errors

## 진행 체크 (stage-7.md 목표)
- [x] UI 다듬기 — 로딩/에러/빈 상태 전 화면, SafeAreaView+KAV
- [x] 아이콘/스플래시/lottie 자산 연결
- [x] husky + lint-staged
- [x] app.json 빌드 설정 (version/buildNumber/bundleIdentifier/scheme)
- [x] eas.json preview 프로필 설정
- [ ] 빈 상태 일러스트 이미지 (assets/images/empty-states/)
- [x] netinfo 오프라인 배너 UI 구현 — 이미 존재 (design-system/OfflineBanner.tsx)
- [ ] EAS Build + TestFlight 제출 (Apple Developer Program 필요)

## 버그 수정 완료 (세션 중)
- ✅ `createInvite` LIST→GET 방식 (Firestore allow list:false 우회) — `core/couple/index.ts`
- ✅ 로그아웃 → 로그인 리다이렉트 — `app/(tabs)/_layout.tsx` auth guard
- ✅ testID 추가 (input-email/password/go-signup/btn-signout) — Maestro E2E 검증 완료
- ✅ Maestro E2E: 코드 생성(XLS5MP) PASS / 로그아웃 리다이렉트 PASS

## 2차 기능 선구현 상태
> ADR-018 기준 이 기능들은 **2차** (TestFlight 게이트 통과 후 진입). 코드는 이미 존재하고 동작하지만,
> 스펙 BR↔테스트 매핑 완성·`active` 승격은 2차 단계에서 한다.
> 현재는 `experimental` 상태로 간주하고 7단계(TestFlight) 완료 기준에 포함하지 않는다.

| 기능 | featureId | 구현 | 테스트 | 상태 |
|------|-----------|------|--------|------|
| 실시간 채팅 | (core 수준, sidebar 진입) | ✅ | ⬜ 매핑 미완 | experimental |
| 우측 사이드바 | — | ✅ | ⬜ | experimental |
| 둘다좋아(투표) | date-decision | ✅ | ⬜ 매핑 미완 | experimental |
| 데이트 빙고 | couple-bingo | ✅ | ⬜ 매핑 미완 | experimental |

## UI 다듬기 완료 (stage-7)
- ✅ 키보드 밀림 — couple-connect/settings KAV 추가, 모달 3종 KAV 추가
- ✅ 에러 핸들링 — lab.tsx toggle 실패 Alert 추가
- ✅ SafeAreaView — couple-connect 추가
- ✅ ScrollView 하단 여백 — calendar/home/date-decision paddingBottom 추가 (FAB 가림 방지)
- ✅ 로딩 분기 — home 일정 섹션 null→Skeleton
- ✅ accessibilityLabel — 메뉴/뒤로가기/삭제 아이콘 버튼 5곳

## 정합성 수정 완료 (P0~P5)
- ✅ P0: ESLint 0 warnings — exhaustive-deps disable-line, 테스트 파일 규칙 완화, import sort 자동 수정
- ✅ P1: 통합 테스트 인프라 — jest.config.integration.js, firebase.test.json, CI 에뮬레이터 설정
- ✅ P2: security-rules.test.ts — @firebase/rules-unit-testing 3개 실제 테스트
- ✅ P3: 1차 feature 누락 테스트 추가 — signOut.test.ts(BR-S2), subscribeEvents.test.ts(BR-10), upcomingEvents.test.ts(BR-3), MoodHistory.test.tsx(BR-7); BR-3 스펙 위반 수정(90d/5→7d/3)
- ✅ P4: calendar.md 매핑 테이블 이미 완성 상태
- ✅ P5: 루트 PNG 10개 git 추적 제거 + .gitignore 추가

## 이전 세션에서 멈춘 곳 (2026-06-12 7차)
- B-side 동기화 Maestro E2E 완성 (7종 전부 PASS)
  - 수정 내역: GratitudeDisplay testID(partner-gratitude, 따옴표 텍스트 오탐 우회)
    + SongCard testID(song-card, 동적 id 없이 카드 감지)
    + test_lab_sync_b 섹션 6·7 testID 기반 전환
    + test_night_message 멱등성 보장(runFlow 수정버튼 처리 + eraseText)
- 다음: 추가 기능 구현 또는 TestFlight 제출 (Apple Developer Program 필요)

## 진행 중인 작업 (시뮬레이터 전용)
> **보류 항목 (비용 발생)**: Apple Developer Program · Firebase Storage Blaze · TestFlight 등. 언급하지 않음.

### ✅ 실험실 탭 (stage-5)
- core/features/: getRegistry / setFeatureEnabled / subscribeFeatureSettings
- app/(tabs)/lab.tsx: experimental 목록 + Switch + 화면 열기
- _layout.tsx: FlaskConical 탭 추가, 사이드바 활성 기능만 표시
- 테스트 8종 green (BR-L1/L2/L3)

### ✅ UI 완성도
- ✅ BingoScreen 로딩 텍스트 → Spinner 교체

### ✅ 캘린더 추가 뷰 (stage-2′)
- ✅ 운동 뷰 (subscribeEventsByType + TypeEventCard)
- ✅ 데이트 뷰 (같은 패턴, 탭 4종: 달력|운동|데이트|사진)

### ✅ 신규 기능 구현 (6종 완료)
- ✅ 자기 전 한 마디 (night-message) — 잘자/아침 메시지 탭, 실시간 동기화
- ✅ 칭찬 저금통 (compliment-jar) — 받은/쓴 탭, 모달 입력
- ✅ 오늘 뭐 먹었어 (daily-food) — 식사타입 4종, 상대/나 섹션
- ✅ 우리가 처음 한 것들 (first-moments) — date ASC 목록, 롱프레스 삭제
- ✅ 선물 위시리스트 (gift-wishlist) — 상대/내 탭, 받았어 토글
- ✅ 오늘의 고마움 (daily-gratitude) — 하루 1회 upsert, 상대방 실시간 구독, 7일 히스토리, 단위테스트 11종
- ✅ 우리의 플레이리스트 (our-playlist) — 노래 추가/삭제/실시간 구독, 기간 태그·메모, FAB+모달, 단위테스트 19종

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
