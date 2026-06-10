# 스펙: 오늘 뭐 먹었어 (daily-food)

> 짝 문서: `architecture.md` (foodLogs), `firestore.rules`, `feature-registry/registry.ts`.

## 개요
오늘 먹은 것을 텍스트/이모지로 기록하고 상대방과 공유하는 기능.
"뭐 먹었어?" 질문 없이 서로의 하루 식사를 자연스럽게 공유한다.

## 사용자 스토리
- **US-1**: 점심을 먹고 나서 오늘 뭐 먹었는지 간단히 기록한다.
- **US-2**: 저녁에 상대방이 오늘 뭐 먹었는지 확인한다.
- **US-3**: 하루에 여러 번 기록 가능 (아침/점심/저녁/간식).

## 화면 흐름
```
[사이드바/실험실] → [DailyFoodScreen]
  ├── 오늘 날짜 헤더
  ├── 상대방 오늘 기록 목록 (실시간)
  ├── 내 오늘 기록 목록 (실시간) + 추가 버튼
  └── 모달: 식사 타입(아침/점심/저녁/간식) + 메뉴 이름 입력 → 저장
```

## 와이어프레임
### DailyFoodScreen
```
┌─ 오늘 뭐 먹었어? ────────────────┐
│ [← 뒤로]    2026년 6월 10일     │
│ ─ 상대방 ──────────────────      │
│ [점심] 비빔밥 🍚       12:30    │
│ [간식] 아이스크림 🍦   15:10    │
│ 빈: EmptyState("아직 기록 없어요") │
│                                  │
│ ─ 나 ─────────────────────       │
│ [아침] 토스트 🍞       08:15    │
│ 빈: EmptyState + [오늘 뭐 먹었어?]│
│                                  │
│                           [＋]   │
└──────────────────────────────────┘
```
### 입력 모달
```
┌─ 뭐 먹었어? ─────────────────────┐
│ [아침][점심][저녁][간식] ← 탭    │
│ TextInput "메뉴 이름"             │
│           [취소] [기록하기]       │
└──────────────────────────────────┘
```
- 메뉴 이름 최대 50자
- 타입 선택 기본값: 현재 시간에 따라 자동 (6~10시→아침, 11~14→점심, 17~20→저녁, 나머지→간식)

## 비즈니스 룰
- **BR-DF1**: 식사 이름 1~50자. 공백만 금지.
- **BR-DF2**: 타입은 `breakfast | lunch | dinner | snack` 중 하나.
- **BR-DF3**: 오늘(KST) 기록만 표시. 어제 기록은 보이지 않음.
- **BR-DF4**: 실시간 구독 — 상대가 추가하면 즉시 표시.
- **BR-DF5**: 기록 삭제 가능 (내 기록만).

## Edge case
| 상황 | 동작 |
|------|------|
| 자정 직후 타임존 경계 | KST 기준 date 필드로 오늘/어제 구분 |
| 50자 초과 | TextInput maxLength + 버튼 비활성화 |
| 삭제 확인 | Alert 1단 확인 후 삭제 |

## API 시그니처
```ts
// features/daily-food/index.ts

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodLog {
  id: string;
  coupleId: string;
  userId: string;
  date: string;       // YYYY-MM-DD KST
  mealType: MealType;
  name: string;
  loggedAt: Date;
}

export async function logFood(
  coupleId: string,
  userId: string,
  mealType: MealType,
  name: string,
): Promise<void>

export async function deleteFood(id: string): Promise<void>

export function subscribeTodayFood(
  coupleId: string,
  cb: (logs: FoodLog[]) => void,
): () => void
```

## Firestore 쓰기 패턴
```ts
// auto-ID addDoc
await addDoc(collection(db, 'foodLogs'), {
  coupleId, userId, date, mealType, name: name.trim(),
  loggedAt: serverTimestamp(),
});
```

## 데이터 모델
### foodLogs
```
id: string          // auto-ID
coupleId: string
userId: string
date: string        // YYYY-MM-DD KST
mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
name: string        // max 50자
loggedAt: Timestamp // 정렬 기준
```

## 보안 규칙
```
match /foodLogs/{docId} {
  allow read:   if isMyCouple(resource.data.coupleId);
  allow create: if isMyCouple(request.resource.data.coupleId)
                && request.resource.data.userId == request.auth.uid
                && request.resource.data.name.size() <= 50;
  allow update: if false;
  allow delete: if resource.data.userId == request.auth.uid;
}
```

## 다른 기능과의 연계
- **실험실 탭**: `status: 'experimental'`, 사이드바 진입

## 테스트
- **단위**: `features/daily-food/__tests__/logFood.test.ts` — BR-DF1(길이), BR-DF2(타입)
- **단위**: `features/daily-food/__tests__/subscribeTodayFood.test.ts` — BR-DF3(오늘만), BR-DF4(실시간)

## BR ↔ 테스트 매핑
| BR | 종류 | 위치 | 테스트 이름 |
|----|------|------|-------------|
| BR-DF1 | 단위 | features/daily-food/__tests__/logFood.test.ts | '[BR-DF1] 51자 reject / 공백 reject' |
| BR-DF2 | 단위 | features/daily-food/__tests__/logFood.test.ts | '[BR-DF2] 유효 mealType만 허용' |
| BR-DF3 | 단위 | features/daily-food/__tests__/subscribeTodayFood.test.ts | '[BR-DF3] 어제 로그는 null' |
| BR-DF4 | 단위 | features/daily-food/__tests__/subscribeTodayFood.test.ts | '[BR-DF4] 새 로그 추가 후 콜백 호출' |
| BR-DF5 | 단위 | features/daily-food/__tests__/logFood.test.ts | '[BR-DF5] deleteFood 호출 후 문서 삭제' |
