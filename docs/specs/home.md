# 스펙: 홈 화면 + 알림 (4단계)

> 짝 문서: `tasks/stage-4.md`, `architecture.md`, `firestore.rules`.

## 개요
홈 탭은 각 feature 의 "오늘 가장 중요한 것" 만 모은 요약 화면.
알림은 두 가지 종류 — 로컬(내 기기 스스로) / 원격(상대방 행동 → 내 기기).
> **범위(ADR-018)**: 1차 MVP 는 **로컬 알림만**. 원격 푸시는 **2차** — 반드시 **Cloud Function 경유**로 발송한다(클라이언트가 상대 토큰을 직접 읽어 쏘지 않는다). 디데이는 사용자 지정 기념일 기준(아래 BR-2).

## 사용자 스토리
- **US-1**: 앱을 열면 오늘 컨디션, 다가오는 일정, 진행 중 투표를 한 화면에서 본다.
- **US-2**: 오후 8시까지 컨디션 미입력이면 로컬 알림으로 너지 받는다.
- **US-3**: 상대방이 컨디션 입력하면 내 기기에 즉시 푸시 알림이 온다.
- **US-4**: 알림 권한을 거부해도 앱은 정상 동작 (크래시 금지).

## 화면 흐름
```
[홈 탭]
  ├── 인사말 + 디데이 (커플 연결 후 N일째)
  ├── 오늘 컨디션 카드 (양쪽)
  │     ├── 내 카드: 입력 전 → [입력하기] / 입력 후 → 표시
  │     └── 상대 카드: 입력 전 → "아직 입력 전" / 입력 후 → 표시
  ├── 다가오는 일정 (오늘~7일, 최대 3개)
  ├── 둘다좋아 배너 (진행 중 투표 있을 때만)
  └── 빙고 진행률 (활성 보드 있을 때만, 25칸 중 N개)
```

## 와이어프레임 (화면별 레이아웃)
### 홈 (`(tabs)/index.tsx`)
```text
┌─ 홈 ─────────────────────────┐
│ 인사말 + D+N일  (display)     │
│ ┌ 오늘 컨디션 (Card)────────┐ │
│ │ 내 카드 | 상대 카드        │ │
│ │ 미입력 → [입력하기]        │ │
│ └──────────────────────────┘ │
│ 다가오는 일정 (최대3, Card)   │
│ 둘다좋아 배너 (진행중일 때만) │
│ 빙고 진행률 (활성일 때만 N/25)│
│ 빈:EmptyState 로딩:Skeleton   │
│ Pull-to-refresh               │
└──────────────────────────────┘
```
- 각 feature 구독함수 합성만(BR-1, 직접 쿼리 금지). 알림 권한 거부해도 정상(BR-4).

## 비즈니스 룰
- **BR-1**: 홈 데이터는 **각 feature 의 구독 함수 합성**으로만 만든다. 새 컬렉션 직접 쿼리 금지. (CLAUDE.md "features 끼리 직접 import 금지" 와 같은 정신)
- **BR-2**: 디데이 계산은 KST 기준 (ADR-009). 기준일은 **사용자가 지정한 `couples.anniversaryDate`(사귄 날)**, 미설정이면 `couples.createdAt`(연결일)로 폴백. 설정 탭에서 변경 가능(BR-S 계열). 커플앱 retention 핵심이므로 1차 MVP 포함(ADR-018).
- **BR-3**: 다가오는 일정은 `event.date >= 오늘 KST 00:00`, 정렬은 `date asc`, 최대 3개.
- **BR-4**: 알림 권한 거부 상태 — 모든 알림 코드는 no-op. UI 에서 "권한 허용하기" CTA 한 번만 노출 후 다시 묻지 않음.
- **BR-5**: Expo Push Token 은 앱 첫 실행 + 토큰 변경 시 `users/{uid}.expoPushToken` 에 저장.
- **BR-6**: 로컬 알림 스케줄은 매 앱 실행 시 재계산:
  - 당일 본인 컨디션 미입력이면 오늘 20:00 KST 알림 예약
  - 이미 입력했으면 예약 취소
- **BR-7**: 원격 알림은 **본인 행동에 대한 알림을 본인에게 보내지 않는다** — 컨디션 입력 등 본인 행동은 상대방 기기로만 전달.
- **BR-8** *(2차, ADR-018)*: 원격 푸시는 **Cloud Function 경유**로만 발송한다. 클라이언트는 상대 `expoPushToken` 을 직접 읽어 Expo Push API 를 호출하지 않는다 — 토큰이 클라이언트에 노출되거나 임의 발송(스팸)이 가능해지기 때문. 흐름: 본인 행동(예: 컨디션 입력) → Firestore 쓰기 → onWrite **Cloud Function** 이 서버에서 상대 토큰을 읽어 Expo Push API 로 발송. (1차 MVP 에는 원격 푸시 없음 — 로컬 알림 BR-6 만)

## Edge case
| 상황 | 동작 |
|------|------|
| 상대방이 토큰 등록 안 함 (구버전 앱) | 원격 알림 시도 생략, 에러 로깅만 |
| Expo Push API 응답 200 OK 인데 실제 전달 실패 | 무시 — receipt 확인 안 함 (트레이드오프 명시) |
| 알림 권한 도중 거부 | 다음 실행 시 권한 안내 배너만 표시, 자동 재요청 X |
| 백그라운드 토큰 갱신 | `addPushTokenListener` 로 감지 → Firestore 업데이트 |
| 비행기 모드에서 컨디션 입력 | Firestore 캐시에 저장, 원격 알림은 복귀 시 전송 |
| 시뮬레이터에서 원격 알림 | iOS 시뮬레이터는 푸시 미지원 — 실기기 필요 안내 |
| 다가오는 일정 0개 | 카드 자체를 숨김 (빈 상태 카드 X) |

## API 시그니처 (TypeScript)
```ts
// core/notifications/
export async function ensurePermissionAndToken(uid: string): Promise<{ status: 'granted'|'denied'; token?: string }>
export async function scheduleMoodReminderIfNeeded(coupleId: string, uid: string): Promise<void>
export async function cancelMoodReminder(): Promise<void>
// ⚠️ 원격 푸시는 2차(ADR-018). 클라이언트에 sendPushToPartner 를 두지 않는다.
//    상대 토큰은 서버(Cloud Function)에서만 읽고 발송한다 — 아래 functions 시그니처 참고.
// functions/ (2차)
export const onMoodWritten: CloudFunction  // moodChecks onWrite → 상대 expoPushToken 조회 → Expo Push API 발송

// features/home/
export function useHomeData(coupleId: string, uid: string): {
  myMood: MoodCheck | null;
  partnerMood: MoodCheck | null;
  upcomingEvents: CalendarEvent[];   // 최대 3개
  pendingVote: { sessionId: string; myVoted: boolean } | null;
  bingoProgress: { boardId: string; checked: number } | null;
  dDay: number;
}
//   - 각 feature 의 subscribe* 를 합성. cleanup 자동.
```

## 원격 푸시 발송 (2차 — Cloud Function 경유)
> 클라이언트는 상대 토큰을 만지지 않는다. 아래는 **서버(functions/)** 코드다.
```ts
// functions/onMoodWritten.ts  — moodChecks 문서 onWrite 트리거 (Admin SDK, 규칙 우회)
export const onMoodWritten = onDocumentWritten('moodChecks/{docId}', async (event) => {
  const after = event.data?.after.data();
  if (!after) return;                                   // 삭제 이벤트 무시
  const { coupleId, userId: authorUid } = after;
  // 같은 커플의 '상대방' uid 조회 (memberIds 에서 작성자 제외)
  const couple = (await db.doc(`couples/${coupleId}`).get()).data();
  const partnerUid = couple?.memberIds?.find((u: string) => u !== authorUid);
  if (!partnerUid) return;                              // 아직 1인 커플이면 종료
  const token = (await db.doc(`users/${partnerUid}`).get()).data()?.expoPushToken;
  if (!token) return;                                   // 토큰 없으면 no-op (BR 'edge')
  await fetch('https://exp.host/--/api/v2/push/send', { // expo-server-sdk 대신 fetch
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: token,
      title: '오늘 컨디션이 도착했어요',
      body: `${after.mood} · 만남 ${after.canMeet ? '가능' : '어려움'}`,
      data: { type: 'mood_updated', date: after.date },
    }),
  });
});
```
> 1차 MVP 는 이 함수를 만들지 않는다(원격 푸시 없음). Cloud Function 도입 시점에 추가 — Blaze 플랜 필요(ADR-018).

## 다른 기능과의 연계
- **2단계 (캘린더)**: `subscribeEvents(coupleId, { from: 오늘, to: +7d })` 의 상위 3개.
- **3a (둘다좋아)**: `subscribeSession` 에서 status='in_progress' && choices[uid] 없음 → 배너.
- **3b (컨디션)**: `subscribePartnerMoodToday` 로 상대 입력 실시간 반영. 원격 푸시는 2차에서 `moodChecks` onWrite Cloud Function 이 담당(클라이언트 발송 코드 없음, BR-8).
- **3c (빙고)**: `subscribeActiveBoard` → `Object.keys(checkedItems).length`.
- **6단계 (커플 해제)**: `couples.status === 'disconnected'` 이면 홈 화면 대신 "재연결 대기" 화면.

## 테스트 (Jest)
- `ensurePermissionAndToken`: 권한 거부 케이스에서 throw 없이 `status:'denied'` 반환.
- `scheduleMoodReminderIfNeeded`: 이미 입력했으면 cancel, 미입력이면 schedule.
- (2차) `onMoodWritten` Cloud Function: 작성자 본인 제외 상대 uid 로만 발송, 상대 토큰 없으면 no-op (throw 금지). 1차에는 원격 푸시 없음.

## BR ↔ 테스트 매핑
| BR | 종류 | 위치 | 테스트 이름 |
|----|------|------|-------------|
| BR-1 | 단위 | features/home/useHomeData.test.ts | '[BR-1] 각 feature subscribe 합성, 직접 쿼리 X' |
| BR-2 | 단위 | core/utils/date.test.ts | '[BR-2] D-day 계산 KST 기준' |
| BR-3 | 단위 | features/home/upcomingEvents.test.ts | '[BR-3] 오늘~7일, date asc, 최대 3개' |
| BR-4 | 단위 | core/notifications/permission.test.ts | '[BR-4] 권한 거부 시 schedule/send 모두 no-op' |
| BR-5 | 통합 | __tests__/integration/push-token-sync.test.ts | '[BR-5] 토큰 변경 시 Firestore 업데이트' |
| BR-6 | 단위 | core/notifications/scheduleMoodReminder.test.ts | '[BR-6] 미입력 시 schedule, 입력 후 cancel' |
| BR-7 | 단위(2차) | functions/onMoodWritten.test.ts | '[BR-7] 작성자 본인에게 발송 안 함 — 상대 uid 로만' |
| BR-8 | 단위(2차) | functions/onMoodWritten.test.ts | '[BR-8] 서버에서만 토큰 조회·발송, 클라이언트 직접 발송 코드 없음' |
