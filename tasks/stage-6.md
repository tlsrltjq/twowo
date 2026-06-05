# 6단계 작업 컨텍스트 — 설정 화면

## 지금 단계: 6단계 — 설정 화면

> **범위(ADR-018)**: 1차(6′) = 설정 화면 + 프로필 수정 + 로그아웃 + **단순 커플 해제**(`status:'disconnected'` 전환, 재연결 정도). **30일 유예 + Scheduled Function + purge + D-3 알림은 2차**(운영 복잡, 공개 출시 직전). 기능 관리 토글도 실험실(2차)과 함께 2차.

## 목표 — 1차 (먼저 끝낸다)

### 설정 화면 (app/(tabs)/settings.tsx) — 1차
- [ ] [1차] 커플 정보 표시 (기념일 D+일수 — `couples.anniversaryDate` 우선/createdAt 폴백, 상대방 닉네임)
- [ ] [1차] 기념일 설정/수정 (`couples.anniversaryDate` — home BR-2 와 동일 소스)
- [ ] [1차] 내 프로필 수정 (닉네임 변경 → Firestore users 업데이트)
- [ ] [1차] 로그아웃 (Firebase Auth signOut + Zustand 상태 초기화)
- [ ] [1차] 커플 연결 해제 버튼
- [ ] [2차] 기능 관리 섹션 (실험실 토글) — 실험실(stage-5)이 2차이므로 함께 2차

### 커플 연결 해제 — 1차는 단순 해제/재연결
> 1차는 "유예 없는 단순 해제 + 재연결". 30일 카운트다운/자동 삭제는 2차.

**해제 시 처리 (core/couple/disconnect.ts) — 1차**
- [ ] [1차] 경고 모달 2단계 확인 (실수 방지, 햅틱 warning)
- [ ] [1차] Firestore couples 문서 업데이트 (`status:'disconnected'`, `disconnectedAt`, `disconnectedBy`)
- [ ] [1차] 양쪽 앱 모두 "재연결 대기 화면"으로 자동 이동 (`couples.status` 구독)
- [ ] [1차] 재연결 대기 화면: "연결이 해제되었습니다" + [재연결] (1차는 **남은 일수/카운트다운 없음**)

**재연결 처리 (core/couple/reconnect.ts) — 1차**
- [ ] [1차] 재연결 화면: 기존 커플 코드로 재연결 or 새 코드 생성
- [ ] [1차] couples.status를 다시 'active'로 변경, disconnectedAt/By 필드 제거
- [ ] [1차] 양쪽 앱 메인 화면으로 복귀 (데이터 그대로)

### 테스트 — 1차
- [ ] [1차] **단위**: `disconnect.test.ts`(status/At/By), `reconnect.test.ts`(데이터 무손실 복귀), `signOut.test.ts`(store clear)
- [ ] [1차] **통합**: `__tests__/integration/disconnect-flow.test.ts`, `reconnect-flow.test.ts` (에뮬레이터)
- [ ] [1차] **권한**: 멤버 아닌 사용자가 disconnectCouple → PERMISSION_DENIED

## 목표 — 2차 (30일 유예 + 자동 삭제, 공개 출시 직전)

### 30일 유예 — 2차
- [ ] [2차] 재연결 대기 화면에 **남은 일수 표시** ("28일 후 데이터가 삭제됩니다")
- [ ] [2차] D-3일 양쪽 로컬 알림 ("3일 후 데이터가 삭제됩니다", lab-settings BR-D6)
- [ ] [2차] "완전 삭제하기"(유예 포기, 즉시 purge — BR-D7)

### 자동 삭제 (Firebase Scheduled Function) — 2차
- [ ] [2차] `functions/cleanupExpiredCouples` (매일 자정): disconnectedAt 기준 30일 초과 couples 탐색 → `purgeCoupleDataNow`
- [ ] [2차] purge 범위: calendarEvents / photos / moodChecks / dateCandidates / voteSessions / bingoBoards / featureSettings / invitations + Storage `couples/{coupleId}/` 폴더 전체
- [ ] [2차] 부분 실패 시 다음 자정 재시도 (무한 retry 방지 5회 후 알림)

### 테스트 — 2차
- [ ] [2차] **단위**: `purgeCoupleDataNow.test.ts`(즉시 삭제 후 컬렉션/Storage 비어있음), `scheduleDelete.test.ts`(D-3 알림 예약)
- [ ] [2차] **통합**: `__tests__/integration/purge-couple.test.ts`
- [ ] [2차] **Scheduled Function 로컬**: `firebase emulators:start --only functions,firestore` 로 cleanup 검증

> ⚠️ Scheduled Function / purge 는 Firebase **Blaze 플랜**(종량제)에서만 가능 → **2차 진입 시** 플랜 전환 확인.
> 1차(단순 해제/재연결)는 클라이언트 + Security Rules 만으로 동작하므로 무료 Spark 플랜에서 가능.

### architecture.md — (이미 반영됨)
- couples 의 status / disconnectedAt / disconnectedBy 필드는 이미 정의됨. anniversaryDate(1차) 도 추가됨.

## 완료 기준 — 1차
- 기념일 설정 → D+일수 반영, 닉네임 수정 → 상대방 앱 실시간 업데이트
- 로그아웃 → 로그인 화면 이동, 캐시 초기화
- 커플 해제 → 양쪽 재연결 대기 화면으로 이동 (카운트다운 없이)
- 재연결 → 메인 화면 복귀, 기존 데이터 그대로 조회 가능
- **lab-settings.md BR-S1/S2, BR-D1~D4 매핑** 1차 항목 green

## 완료 기준 — 2차
- 30일 경과 시 Scheduled Function 이 컬렉션/Storage 정리 (수동 트리거 확인, 고아 0건)
- D-3 알림 + "완전 삭제하기" 동작
- **lab-settings.md BR-D5/D6/D7 매핑** 모두 green

## 건드리면 안 되는 파일
- core/couple/ 내 coupleId 생성 로직 (disconnect/reconnect만 수정)
- .env


## 다음 단계 예고
7단계: UI 다듬기, EAS Build, TestFlight 배포
