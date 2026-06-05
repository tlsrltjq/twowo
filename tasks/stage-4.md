# 4단계 작업 컨텍스트 — 홈 화면 + 알림

## 지금 단계: 4단계 — 홈 화면 + 알림

> **범위(ADR-018)**: 1차 = **홈 요약 + 기념일 디데이 + 로컬 알림만**. 원격 푸시는 **2차** — Cloud Function(`moodChecks` onWrite)이 서버에서 발송한다. 클라이언트가 상대 토큰을 직접 읽어 Expo Push API 를 호출하지 않는다(토큰 노출/스팸 방지, home BR-8). 투표 대기 배너/빙고 진행률은 해당 feature 가 2차라 1차 홈에서는 노출 안 됨.

## 알림 구조 이해 (중요)
이 단계에서 알림은 두 종류가 섞여 있음. 구현 방식이 완전히 다름.

### 로컬 알림 (기기 자체 발송 — 서버 불필요)
> 특정 시간에 내 기기 스스로 울리는 알림. 인터넷 없어도 작동.
- "매일 오후 8시 컨디션 미입력 알림"
- `expo-notifications`의 `scheduleNotificationAsync`로 구현
- 서버 코드 불필요

### 원격 알림 (상대방 기기로 발송) — **2차, Cloud Function 경유** (ADR-018, home BR-8)
> 내 행동이 상대방 폰에 알림을 보내야 하는 경우. **1차 MVP 에는 없음.**
- "상대방이 컨디션 입력했을 때 내 폰에 알림"
- 흐름: 본인 `moodChecks` 쓰기 → **Cloud Function `onMoodWritten`(서버)** 이 상대 토큰을 읽어
  `https://exp.host/--/api/v2/push/send` 로 발송 → APNs → 상대방 폰
- ⚠️ **클라이언트에서 상대 토큰을 직접 읽어 발사하지 않는다** — 토큰 노출/임의 발송(스팸) 방지.
- Blaze 플랜 필요. `expoPushToken` 저장(아래)은 1차에서 해둬도 되지만, 발송 함수는 2차에서 functions/ 에만 둔다.

### Expo Push Token vs FCM Token 구분
| 항목 | Expo Push Token | FCM Token |
|------|-----------------|-----------|
| 형식 | `ExponentPushToken[xxx]` | 긴 문자열 |
| 용도 | Expo Push API 경유 발송 | Firebase Cloud Messaging 직접 발송 |
| 이 앱에서 | ✅ 사용 | ❌ 미사용 |

→ Firestore users에 `expoPushToken` 필드로 저장(architecture). 2차 Cloud Function 이 이 토큰을 서버에서 읽어 발송.

## 목표

### 홈 화면 (app/(tabs)/index.tsx) — 1차
- [ ] 오늘 요약 카드 레이아웃 구현
- [ ] 기념일 디데이 표시 (`couples.anniversaryDate` 우선, 없으면 createdAt 폴백 — home BR-2)
- [ ] 상대방 컨디션 표시 (3b단계 moodChecks 연동)
- [ ] 다가오는 일정 표시 (캘린더 연동, 최대 3개)
- [ ] ~~둘다좋아 투표 대기 배너~~ → **2차**(투표 feature 가 2차). 배너 자리만 조건부로 비워둠

### 알림 설정 — 1차는 로컬만
- [ ] 앱 최초 실행 시 알림 권한 요청
- [ ] Expo Push Token 발급 → Firestore users.expoPushToken에 저장 (2차 CF 가 쓸 토큰 미리 확보)
- [ ] 로컬 알림: 매일 오후 8시 컨디션 미입력 시 알림 스케줄 등록
  - 앱 실행 시마다 당일 컨디션 입력 여부 확인 후 스케줄 갱신
- [ ] ~~원격 알림(클라이언트 직접 발송)~~ → **2차, Cloud Function `onMoodWritten`** (home BR-8). 클라이언트에 발송 코드 없음

### core/notifications/ 모듈 — 1차
- [ ] 알림 권한 요청 + 토큰 관리 함수
- [ ] 로컬 알림 스케줄 등록/취소 함수
- [ ] ~~Expo Push API 호출 함수~~ → **2차 functions/onMoodWritten.ts** (서버 전용)

### 테스트 — 1차
- [ ] **단위 테스트**: `permission.test.ts`(권한 거부 시 no-op), `scheduleMoodReminder.test.ts`(입력 여부에 따라 schedule/cancel)
- [ ] **통합 테스트**: `__tests__/integration/push-token-sync.test.ts`(토큰 변경 → Firestore 반영)
- [ ] (2차) `functions/onMoodWritten.test.ts` — 작성자 본인 제외 상대에게만, 토큰 없으면 no-op (home BR-7/8)

## 완료 기준 (1차)
- 홈 화면에 기념일 디데이 + 컨디션 + 다가오는 일정 표시됨
- 앱 설치 후 알림 권한 → Expo Push Token이 Firestore에 저장됨
- 오후 8시 로컬 알림 시뮬레이터에서 수신 확인
- **home.md 의 BR ↔ 테스트 매핑** 중 1차 항목 모두 매핑됨 (BR-7/8 원격 푸시는 2차)
- 단위 테스트 green, 실기기 E2E 는 `docs/qa-checklist.md` 의 알림 섹션 통과

## 주의사항
- 원격 알림(2차)은 실기기 + Cloud Function(Blaze) 필요. 1차에서는 다루지 않음.
- Expo Push API는 분당 600건 제한 (커플 2명 앱에서 초과 불가능)
- 알림 권한 거부 시 앱이 크래시 없이 graceful하게 동작해야 함

## 건드리면 안 되는 파일
- core/couple/
- feature-registry/types.ts


## 다음 단계 예고
5단계: 실험실 탭 — 기능 ON/OFF 토글 UI
