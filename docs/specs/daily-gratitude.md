# 스펙: 오늘의 고마움 교환 (daily-gratitude)

> 짝 문서: `architecture.md` (gratitudeEntries),
> `firestore.rules`, `decisions.md` ADR-009 (타임존 KST).

## 개요
매일 상대방에게 고마운 것 한 마디씩 교환. KST 기준 하루 1회 입력, 당일 자정 전까지 수정 가능.
컨디션(`mood-share`)과 구조가 유사하지만 텍스트 한 줄에 집중한 가벼운 감정 기록.

## 사용자 스토리
- **US-1**: 오늘 상대방에게 고마운 것을 한 문장으로 적어서 보낸다.
- **US-2**: 상대방이 오늘 나에게 뭘 고마워하는지 바로 확인할 수 있다.
- **US-3**: 마음이 바뀌면 자정 전까지 수정할 수 있다.
- **US-4**: 지난 7일 서로의 고마움 기록을 한 눈에 본다.

## 화면 흐름
```
사이드바 → [오늘의 고마움] 진입
  ├── 오늘 미입력
  │     → TextInput + [저장] 버튼
  ├── 오늘 입력 완료
  │     → 내 메시지 표시 + [수정] 링크 (자정 전만)
  └── 상대방 카드
        → 입력 전: "아직 안 적었어요 💭"
        → 입력 후: 메시지 표시

[히스토리] (스크롤 아래)
  └── 최근 7일 — 날짜별로 나 / 상대 한 줄씩
```

## 와이어프레임

### GratitudeScreen (`features/daily-gratitude/GratitudeScreen.tsx`)
```
┌─ 오늘의 고마움 ──────────────────┐
│ ┌─ 내 고마움 (Card) ────────────┐ │
│ │ 오늘 상대에게 고마운 것 한 마디  │ │
│ │ [TextInput multiline 100자]   │ │
│ │ 34/100                        │ │
│ │              [저장 Button]    │ │
│ └───────────────────────────────┘ │
│                                   │
│ ┌─ 상대방 고마움 (Card) ─────────┐ │
│ │  "같이 밥 먹어줘서 고마워 🙏"   │ │
│ │  (미입력: EmptyState 아이콘)   │ │
│ └───────────────────────────────┘ │
│                                   │
│ ── 지난 7일 ───────────────────── │
│  06-11  나: "..." / 상대: "..."   │
│  06-10  나: "..." / 상대: "..."   │
│  ...                              │
│  (아직 없으면 EmptyState)         │
│                                   │
│ 로딩: Skeleton  오류: EmptyState  │
└───────────────────────────────────┘
```
- 저장 성공 → Toast("고마움을 전달했어요 🙏")
- 저장 실패 → Toast("저장에 실패했어요", error)
- 100자 초과 입력 → onChange에서 차단 (maxLength)
- 수정 링크: 오늘 입력 완료 + KST 자정 전일 때만 표시

## 비즈니스 룰

- **BR-1**: 하루 1회 입력. 문서 ID = `{coupleId}_{userId}_{date}` (KST). 같은 날 재호출은 update(upsert).
- **BR-2**: 기존 문서의 `date` 필드가 오늘(KST)이 아니면 `GratitudeLockError` — 다른 날 수정 불가.
- **BR-3**: `message`는 1자 이상 100자 이하. 빈 문자열 거부.
- **BR-4**: 상대방 메시지는 실시간 구독(`onSnapshot`), 입력 즉시 표시.
- **BR-5**: 히스토리는 최근 7일 (`coupleId + userId + date DESC` 인덱스 사용).

## Edge case

| 상황 | 동작 |
|------|------|
| 네트워크 단절 | Firestore 오프라인 캐시로 저장 → 복귀 시 자동 동기화 |
| 자정 경계 입력 | KST date 기준 — 23:59에 저장하면 그 날 문서, 00:00 이후는 다음 날 |
| 다른 날 수정 시도 | `GratitudeLockError` → Toast("오늘만 수정할 수 있어요") |
| 빈 메시지 저장 | 저장 버튼 disabled (message.trim().length === 0) |
| 상대방 미연결 | coupleId 없으면 화면 진입 불가 (기존 인증 가드 처리) |

## API 시그니처 (TypeScript)

```ts
// features/daily-gratitude/schema.ts
export interface GratitudeEntry {
  id: string;           // coupleId_userId_date
  coupleId: string;
  userId: string;
  date: string;         // YYYY-MM-DD (KST)
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GratitudeInput {
  coupleId: string;
  userId: string;
  message: string;
}

export class GratitudeLockError extends Error {
  constructor() { super('locked: cannot edit past day'); }
}

// features/daily-gratitude/index.ts
export async function setTodayGratitude(input: GratitudeInput): Promise<GratitudeEntry>
export async function getTodayGratitude(coupleId: string, userId: string): Promise<GratitudeEntry | null>
export async function getRecent7DaysGratitude(coupleId: string, userId: string): Promise<GratitudeEntry[]>
export function subscribePartnerGratitudeToday(
  coupleId: string,
  partnerUid: string,
  cb: (entry: GratitudeEntry | null) => void,
): () => void
```

## Firestore / Storage 쓰기 패턴

```ts
// setTodayGratitude — runTransaction으로 date 검증 후 upsert
await runTransaction(db, async (tx) => {
  const ref = doc(db, 'gratitudeEntries', docId(coupleId, userId, today));
  const snap = await tx.get(ref);
  if (snap.exists() && snap.data().date !== today) throw new GratitudeLockError();
  tx.set(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
});
```

## 데이터 모델

### gratitudeEntries
```
id:        string        // {coupleId}_{userId}_{date}
coupleId:  string        // 보안 규칙 기준
userId:    string        // 작성자
date:      string        // YYYY-MM-DD (KST)
message:   string        // 1~100자
createdAt: Timestamp
updatedAt: Timestamp
```

## 보안 규칙

```
match /gratitudeEntries/{entryId} {
  allow read:   if isMyCouple(resource.data.coupleId);
  allow create: if isMyCouple(request.resource.data.coupleId)
                && request.resource.data.userId == request.auth.uid;
  allow update: if isMyCouple(resource.data.coupleId)
                && resource.data.userId == request.auth.uid;
  allow delete: if false;
}
```

## 다른 기능과의 연계
- **홈 화면**: 필요 시 오늘 나/상대 입력 여부를 뱃지로 표시 가능 (1차 미포함)
- **mood-share**: 동일한 KST date key 패턴, `GratitudeLockError` 구조 참고

## 테스트
- **단위**: `features/daily-gratitude/__tests__/setTodayGratitude.test.ts` — BR-1/2/3
- **단위**: `features/daily-gratitude/__tests__/schema.test.ts` — BR-3 (zod)
- **컴포넌트**: (2차) `features/daily-gratitude/__tests__/GratitudeScreen.test.tsx` — BR-2 수정 버튼 조건

## BR ↔ 테스트 매핑
| BR | 종류 | 위치 | 테스트 이름 |
|----|------|------|-------------|
| BR-1 | 단위 | features/daily-gratitude/__tests__/setTodayGratitude.test.ts | '[BR-1] 같은 날 재호출 → update' |
| BR-2 | 단위 | features/daily-gratitude/__tests__/setTodayGratitude.test.ts | '[BR-2] 다른 날 수정 → GratitudeLockError' |
| BR-3 | 단위 | features/daily-gratitude/__tests__/schema.test.ts | '[BR-3] message 1~100자 검증' |
| BR-4 | 수동 | QA | 상대 입력 즉시 화면 반영 확인 |
| BR-5 | 단위 | features/daily-gratitude/__tests__/setTodayGratitude.test.ts | '[BR-5] getRecent7Days 최대 7건' |
