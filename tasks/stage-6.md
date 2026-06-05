# 6단계 작업 컨텍스트 — 설정 화면

## 지금 단계: 6단계 — 설정 화면

> **범위(ADR-018)**: 1차(6′) = 설정 화면 + 프로필 수정 + 로그아웃 + **단순 커플 해제**(`status:'disconnected'` 전환, 재연결 정도). **30일 유예 + Scheduled Function + purge + D-3 알림은 2차**(운영 복잡, 공개 출시 직전). 기능 관리 토글도 실험실(2차)과 함께 2차.

## 목표

### 설정 화면 (app/(tabs)/settings.tsx)
- [ ] 커플 정보 표시 (커플 연결일, D+일수, 상대방 닉네임)
- [ ] 내 프로필 수정 (닉네임 변경 → Firestore users 업데이트)
- [ ] 기능 관리 섹션 (실험실과 동일한 토글)
- [ ] 로그아웃 (Firebase Auth signOut + Zustand 상태 초기화)
- [ ] 커플 연결 해제 버튼

### 커플 연결 해제 — 30일 유예 로직
해제 즉시 삭제하지 않고 30일간 데이터를 보존. 재연결 시 복구 가능.

**해제 시 처리 (core/couple/disconnect.ts)**
- [ ] 경고 모달 2단계 확인 (실수 방지)
- [ ] Firestore couples 문서 업데이트
  ```
  status: 'disconnected'
  disconnectedAt: Timestamp  // 해제 시각
  disconnectedBy: userId     // 해제한 사람
  ```
- [ ] 양쪽 앱 모두 "재연결 대기 화면"으로 이동
- [ ] 재연결 대기 화면에서 남은 일수 표시 ("28일 후 데이터가 삭제됩니다")

**30일 내 재연결 처리 (core/couple/reconnect.ts)**
- [ ] 재연결 화면: 기존 커플 코드로 재연결 or 새 코드 생성
- [ ] couples.status를 다시 'active'로 변경, disconnectedAt 필드 제거
- [ ] 양쪽 앱 메인 화면으로 복귀 (데이터 그대로 복원)

**30일 경과 후 데이터 삭제**
- [ ] Firebase Scheduled Function 설정 (매일 자정 실행)
  - disconnectedAt 기준 30일 초과한 couples 문서 탐색
  - 해당 coupleId의 모든 Firestore 데이터 삭제
    (calendarEvents, photos 메타데이터, moodChecks, featureSettings 등)
  - Firebase Storage의 해당 coupleId 폴더 삭제 (사진 원본 + 썸네일)
- [ ] 삭제 전 D-3일에 양쪽에 로컬 알림 발송 ("3일 후 데이터가 삭제됩니다")

### 테스트
- [ ] **Jest 단위 테스트**: `disconnect.test.ts`(트랜잭션 status/At/By), `reconnect.test.ts`(데이터 무손실 복귀), `purgeCoupleDataNow.test.ts`(즉시 삭제 후 컬렉션/Storage 비어있음)
- [ ] **통합 테스트**: `__tests__/integration/disconnect-flow.test.ts`, `__tests__/integration/reconnect-flow.test.ts`, `__tests__/integration/purge-couple.test.ts` (모두 에뮬레이터)
- [ ] **Scheduled Function 로컬 테스트**: `firebase emulators:start --only functions,firestore` 로 cleanup 동작 검증

> ⚠️ Scheduled Function은 Firebase Blaze 플랜(종량제)에서만 사용 가능.
> 무료 Spark 플랜에서는 실행 불가. 6단계 시작 전 Firebase 플랜 확인 필요.
> (월 사용량이 매우 적으므로 비용은 사실상 $0에 가까움)

### architecture.md 업데이트 필요 (이 단계에서)
- couples 컬렉션에 status, disconnectedAt, disconnectedBy 필드 추가

## 완료 기준
- 닉네임 수정 → Firestore 반영 → 상대방 앱 실시간 업데이트
- 로그아웃 → 로그인 화면 이동, 캐시 초기화
- 커플 해제 → 양쪽 재연결 대기 화면으로 이동, 남은 일수 표시
- 재연결 → 메인 화면 복귀, 기존 데이터 그대로 조회 가능
- Scheduled Function 배포 완료 및 테스트 (수동 트리거로 확인)
- **lab-settings.md 의 BR-D* 매핑** 모두 매핑됨
- 통합 테스트 green, Scheduled Function 수동 트리거 → 컬렉션/Storage 정리 확인

## 건드리면 안 되는 파일
- core/couple/ 내 coupleId 생성 로직 (disconnect/reconnect만 수정)
- .env


## 다음 단계 예고
7단계: UI 다듬기, EAS Build, TestFlight 배포
