# 4단계 작업 컨텍스트 — 홈 화면 + 알림

## 지금 단계: 4단계 — 홈 화면 + 알림

## 알림 구조 이해 (중요)
이 단계에서 알림은 두 종류가 섞여 있음. 구현 방식이 완전히 다름.

### 로컬 알림 (기기 자체 발송 — 서버 불필요)
> 특정 시간에 내 기기 스스로 울리는 알림. 인터넷 없어도 작동.
- "매일 오후 8시 컨디션 미입력 알림"
- `expo-notifications`의 `scheduleNotificationAsync`로 구현
- 서버 코드 불필요

### 원격 알림 (상대방 기기로 발송 — 중간 서버 필요)
> 내 행동이 상대방 폰에 알림을 보내야 하는 경우.
- "상대방이 컨디션 입력했을 때 내 폰에 알림"
- 내 앱 → Expo Push API 서버 → APNs → 상대방 폰 순서로 전달됨
- **Expo Push API 방식 채택**: 별도 서버 없이 클라이언트에서
  `https://exp.host/--/api/v2/push/send`로 HTTP 요청
- 상대방의 Expo Push Token을 Firestore users에 저장해뒀다가 활용

### Expo Push Token vs FCM Token 구분
| 항목 | Expo Push Token | FCM Token |
|------|-----------------|-----------|
| 형식 | `ExponentPushToken[xxx]` | 긴 문자열 |
| 용도 | Expo Push API 경유 발송 | Firebase Cloud Messaging 직접 발송 |
| 이 앱에서 | ✅ 사용 | ❌ 미사용 (Cloud Functions 없으므로) |

→ Firestore users에 `expoPushToken` 필드로 저장할 것

## 목표

### 홈 화면 (app/(tabs)/index.tsx)
- [ ] 오늘 요약 카드 레이아웃 구현
- [ ] 상대방 컨디션 표시 (3b단계 moodChecks 연동)
- [ ] 다가오는 일정 표시 (캘린더 연동, 최대 3개)
- [ ] 둘다좋아 투표 대기 중 배너 (미투표 상태일 때만)

### 알림 설정
- [ ] 앱 최초 실행 시 알림 권한 요청
- [ ] Expo Push Token 발급 → Firestore users.expoPushToken에 저장
- [ ] 로컬 알림: 매일 오후 8시 컨디션 미입력 시 알림 스케줄 등록
  - 앱 실행 시마다 당일 컨디션 입력 여부 확인 후 스케줄 갱신
- [ ] 원격 알림: 컨디션 입력 완료 시 상대방 Expo Push Token으로 발송
  - `expo-server-sdk` 없이 fetch로 직접 Expo Push API 호출

### core/notifications/ 모듈
- [ ] 알림 권한 요청 + 토큰 관리 함수
- [ ] 로컬 알림 스케줄 등록/취소 함수
- [ ] Expo Push API 호출 함수 (원격 알림 발송)

### 테스트
- [ ] **단위 테스트**: `permission.test.ts`(권한 거부 시 no-op), `scheduleMoodReminder.test.ts`(입력 여부에 따라 schedule/cancel), `sendPushToPartner.test.ts`(본인에게 발송 안 함, 토큰 없으면 throw X)
- [ ] **통합 테스트**: `__tests__/integration/push-token-sync.test.ts`(토큰 변경 → Firestore 반영)

## 완료 기준
- 홈 화면에 컨디션 + 다가오는 일정 표시됨
- 앱 설치 후 알림 권한 → Expo Push Token이 Firestore에 저장됨
- 오후 8시 로컬 알림 시뮬레이터에서 수신 확인
- 컨디션 입력 시 상대방 기기에 원격 알림 수신 확인 (실기기 필요)
- **home.md 의 BR ↔ 테스트 매핑** 모두 매핑됨
- 단위 테스트 green, 실기기 E2E 는 `docs/qa-checklist.md` 의 알림 섹션 통과

## 주의사항
- 원격 알림 실기기 테스트는 시뮬레이터에서 불가. 실제 iPhone 2대 필요.
- Expo Push API는 분당 600건 제한 (커플 2명 앱에서 초과 불가능)
- 알림 권한 거부 시 앱이 크래시 없이 graceful하게 동작해야 함

## 건드리면 안 되는 파일
- core/couple/
- feature-registry/types.ts


## 다음 단계 예고
5단계: 실험실 탭 — 기능 ON/OFF 토글 UI
