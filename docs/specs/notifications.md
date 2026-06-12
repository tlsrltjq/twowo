# 원격 푸시 & 커플 해제 유예 — 기능 명세

> Cloud Functions v2 (Blaze 플랜 필요). 배포: `firebase deploy --only functions`
> 관련 ADR: ADR-024 (Cloud Functions 선택)

## 범위
1. **원격 푸시** — 파트너 메시지/일정 생성 시 상대방에게 Expo Push 알림
2. **커플 해제 30일 유예** — `disconnectedAt` 기준 30일 후 Scheduled Function 이 모든 데이터 삭제

---

## 비즈니스 규칙

### 원격 푸시

| ID | 규칙 |
|----|------|
| BR-N1 | 커플 채팅에 메시지가 생성되면(`couples/{coupleId}/messages` onCreate) 수신자에게 Expo 원격 푸시를 보낸다. 제목 = 발신자 `displayName`, 본문 = 메시지 본문(최대 60자 + `…`) 또는 `📷 사진` |
| BR-N2 | 캘린더 일정이 생성되면(`calendarEvents` onCreate) 파트너에게 Expo 원격 푸시를 보낸다. 제목 = 작성자 `displayName`, 본문 = `📅 새 일정: {title}` |
| BR-N3 | 수신자의 `userTokens/{uid}.expoPushToken` 이 없거나 `ExponentPushToken[` 으로 시작하지 않으면 푸시를 생략한다 (silent failure). |

### 커플 해제 30일 유예 및 데이터 삭제

| ID | 규칙 |
|----|------|
| BR-D3 | 매일 KST 01:00(UTC 16:00) Scheduled Function(`scheduledCleanup`)이 실행되어 `couples.status == 'disconnected'` AND `disconnectedAt ≤ now − 30일` 인 문서를 찾는다. |
| BR-D4 | (기존) 30일 이내에는 `reconnectCouple`로 재연결 가능 — `status: 'active'`, `disconnectedAt/By null`. |
| BR-D5 | 삭제 대상 커플의 Storage `couples/{coupleId}/` 경로 아래 모든 파일을 삭제한다. |
| BR-D6 | 삭제 시 양쪽 `users/{uid}.coupleId` 를 `null` 로 초기화한다. |
| BR-D7 | 삭제 대상 커플의 messages 서브컬렉션, 관련 최상위 컬렉션(calendarEvents/photos/featureSettings/moodChecks/nightMessages/compliments/foodLogs/firstMoments/wishlistItems/gratitudeEntries/playlistSongs/dateCandidates/voteSessions/bingoBoards/invitations)을 모두 삭제한 뒤 `couples` 문서를 삭제한다. |

---

## 구현 위치

| 모듈 | 경로 |
|------|------|
| 원격 푸시 Functions | `functions/src/push.ts` |
| 스케줄 정리 Function | `functions/src/cleanup.ts` |
| Functions 진입점 | `functions/src/index.ts` |
| Firebase 설정 | `firebase.json` (functions 섹션 추가) |

---

## BR ↔ 테스트 매핑

| BR | 테스트 파일 | 종류 | 상태 |
|----|------------|------|------|
| BR-N1 | — | Cloud Function 통합 (emulator) | ⬜ 2차 |
| BR-N2 | — | Cloud Function 통합 (emulator) | ⬜ 2차 |
| BR-N3 | — | Cloud Function 통합 (emulator) | ⬜ 2차 |
| BR-D3 | — | Cloud Function 통합 (emulator) | ⬜ 2차 |
| BR-D5 | — | 수동 (Storage 삭제 검증) | ⬜ 2차 |
| BR-D6 | — | 수동 (users.coupleId null 확인) | ⬜ 2차 |
| BR-D7 | — | 수동 (Firestore 문서 삭제 확인) | ⬜ 2차 |

> Cloud Functions 단위 테스트는 `firebase-functions-test` + Admin SDK 에뮬레이터가 필요.
> experimental 완화(TEST_STRATEGY 참고) 적용. `active` 승격 시 매핑 완성 필수.
