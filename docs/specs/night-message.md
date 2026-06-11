# 스펙: 자기 전 한 마디 (night-message)

> 짝 문서: `architecture.md` (nightMessages), `firestore.rules`, `feature-registry/registry.ts`.

## 개요
자기 전에 상대방에게 한 마디를 남기고, 아침에 상대방이 보낸 기상 메시지를 확인하는 기능.
하루 두 번(밤/아침) 텍스트 메시지를 주고받으며 매일 연결감을 느끼게 한다.

## 사용자 스토리
- **US-1**: 자기 전에 "잘 자" 탭을 열어 오늘 하루 한 마디를 상대에게 남긴다.
- **US-2**: 아침에 일어나서 "좋은 아침" 탭을 열어 상대의 기상 메시지를 확인하고 내 메시지를 보낸다.
- **US-3**: 상대방이 메시지를 보내면 실시간으로 화면에 반영된다.

## 화면 흐름
```
[사이드바 or 실험실] → [NightMessageScreen]
  ├── 탭: 🌙 잘자 | ☀️ 좋은 아침
  ├── 상대방 오늘 메시지 카드 (없으면 EmptyState)
  ├── 내 오늘 메시지 카드 (없으면 입력창)
  └── [보내기] → 저장 후 카드로 전환 (수정 가능)
```

## 와이어프레임
### NightMessageScreen (`(features)/night-message.tsx`)
```
┌─ 자기 전 한 마디 ────────────────┐
│ [← 뒤로]                        │
│ ┌─────────────────────────────┐ │
│ │ 🌙 잘자  |  ☀️ 좋은 아침    │ │  ← 탭 (ScrollView 없음, 2칸)
│ └─────────────────────────────┘ │
│                                  │
│ 💬 파트너 메시지                 │
│ ┌─────────────────────────────┐ │
│ │ "오늘도 수고했어 ♥"          │ │  ← 상대 메시지 Card
│ │ 파트너닉   22:15             │ │
│ └─────────────────────────────┘ │
│ 빈: EmptyState("아직 메시지가 없어요")  │
│                                  │
│ ✏️ 내 메시지                     │
│ ┌─────────────────────────────┐ │
│ │ [TextInput "한 마디 남기기"] │ │  ← 없으면 입력창
│ │                   [보내기]  │ │
│ └─────────────────────────────┘ │
│ 있으면: Card + [수정] 버튼       │
│ 로딩: Skeleton 2개               │
└──────────────────────────────────┘
```
- 탭 전환 시 해당 type의 메시지 쌍으로 전환 (실시간 구독)
- 메시지 전송 후 입력창 → 카드 전환 (애니메이션 없음, 단순 state)

## 비즈니스 룰
- **BR-NM1**: 하루에 type당 최신 메시지 1개. 덮어쓰기(upsert) 방식 — doc ID = `{coupleId}_{userId}_{date}_{type}`.
- **BR-NM2**: 메시지 길이 최대 100자. 공백만으로 이루어진 메시지 저장 금지.
- **BR-NM3**: 상대방 메시지와 내 메시지를 모두 실시간 구독. 상대방이 보내면 즉시 반영.
- **BR-NM4**: 오늘 날짜(KST) 기준으로 메시지를 필터링. 어제 메시지는 표시 안 함.
- **BR-NM5**: 메시지는 삭제 불가. 수정만 가능(덮어쓰기).

## Edge case
| 상황 | 동작 |
|------|------|
| 자정 직후 타임존 경계 | KST 기준 `date` 필드로 오늘/어제 구분 |
| 네트워크 단절 후 전송 | onSnapshot 오프라인 캐시 → 복귀 시 자동 동기화 |
| 100자 초과 입력 | TextInput `maxLength={100}` + 버튼 비활성화 |
| 공백만 입력 | trim() === '' → 버튼 비활성화 |

## API 시그니처
```ts
// features/night-message/index.ts

export interface NightMessage {
  id: string;          // {coupleId}_{userId}_{date}_{type}
  coupleId: string;
  userId: string;
  date: string;        // YYYY-MM-DD KST
  type: 'night' | 'morning';
  text: string;
  sentAt: Date;
}

export async function sendNightMessage(
  coupleId: string,
  userId: string,
  type: 'night' | 'morning',
  text: string,
): Promise<void>

export function subscribeTodayMessages(
  coupleId: string,
  myUid: string,
  partnerUid: string,
  type: 'night' | 'morning',
  cb: (mine: NightMessage | null, partner: NightMessage | null) => void,
): () => void
```

## Firestore 쓰기 패턴
```ts
// upsert: doc ID가 결정론적 → setDoc으로 항상 덮어쓰기
const id = `${coupleId}_${userId}_${date}_${type}`;
await setDoc(doc(db, 'nightMessages', id), {
  coupleId, userId, date, type, text, sentAt: serverTimestamp(),
});
```

## 데이터 모델
### nightMessages
```
id: string              // {coupleId}_{userId}_{date}_{type}
coupleId: string        // 보안 규칙 기반
userId: string          // 보낸 사람
date: string            // YYYY-MM-DD KST
type: 'night' | 'morning'
text: string            // max 100자
sentAt: Timestamp
```

## 보안 규칙
```
match /nightMessages/{docId} {
  allow read:  if isMyCouple(resource.data.coupleId);
  allow create: if isMyCouple(request.resource.data.coupleId)
                && request.resource.data.userId == request.auth.uid
                && request.resource.data.text.size() <= 100;
  allow update: if isMyCouple(resource.data.coupleId)
                && resource.data.userId == request.auth.uid;
}
```

## 다른 기능과의 연계
- **실험실 탭**: `status: 'experimental'` 로 등록, 사이드바 + 실험실에서 진입
- **홈 화면**: 연계 없음 (홈 복잡도 최소화)

## 테스트
- **단위**: `features/night-message/__tests__/sendNightMessage.test.ts` — BR-NM1(upsert), BR-NM2(100자/공백)
- **단위**: `features/night-message/__tests__/subscribeTodayMessages.test.ts` — BR-NM3(실시간), BR-NM4(오늘 날짜)

## BR ↔ 테스트 매핑
| BR | 종류 | 위치 | 테스트 이름 |
|----|------|------|-------------|
| BR-NM1 | 단위 | features/night-message/__tests__/sendNightMessage.test.ts | '[BR-NM1] 같은 날 같은 type 재전송 시 덮어쓰기' |
| BR-NM2 | 단위 | features/night-message/__tests__/sendNightMessage.test.ts | '[BR-NM2] 101자 전송 시 reject / 공백만 reject' |
| BR-NM3 | 단위 | features/night-message/__tests__/subscribeTodayMessages.test.ts | '[BR-NM3] 상대 메시지 저장 후 구독 콜백 호출' |
| BR-NM4 | 단위 | features/night-message/__tests__/subscribeTodayMessages.test.ts | '[BR-NM4] 어제 메시지는 null 반환' |
| BR-NM5 | 단위 | features/night-message/__tests__/sendNightMessage.test.ts | '[BR-NM5] 수정(upsert) 후 text 갱신 확인' |
