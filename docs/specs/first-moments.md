# 스펙: 우리가 처음 한 것들 (first-moments)

> 짝 문서: `architecture.md` (firstMoments), `firestore.rules`, `feature-registry/registry.ts`.

## 개요
커플이 처음으로 함께 한 것들을 기록하는 추억 앨범 기능.
"첫 키스", "첫 여행", "처음 같이 밥 먹은 날" 등을 날짜와 함께 저장한다.

## 사용자 스토리
- **US-1**: 처음 여행을 다녀왔을 때 "처음 여행 간 날"로 기록해둔다.
- **US-2**: 목록을 보며 우리가 처음 함께 했던 것들을 회상한다.
- **US-3**: 기록은 두 사람 모두 추가 가능, 삭제는 본인만.

## 화면 흐름
```
[사이드바/실험실] → [FirstMomentsScreen]
  ├── 헤더 + 기록 개수
  ├── FlatList — FirstMomentCard (아이콘·제목·날짜·메모)
  ├── 빈: EmptyState
  └── FAB(+) → 모달: 제목, 날짜, 메모(선택) 입력
```

## 와이어프레임
### FirstMomentsScreen
```
┌─ 우리가 처음 한 것들 ─────────────┐
│ [← 뒤로]    우리가 처음 한 것들  │
│ 🌟 총 N개                        │
│ ─── FlatList ────────────────    │
│ ✨ 처음 여행 간 날               │
│    2026-03-15 · "제주도였어"     │
│ ✨ 처음 같이 밥 먹은 날          │
│    2026-01-10                    │
│ 빈: EmptyState(별+문구)          │
│ 로딩: Skeleton 3개               │
│                           [＋]   │
└──────────────────────────────────┘
```
### 입력 모달
```
┌─ 새로운 처음 기록하기 ──────────────┐
│ 어떤 처음이에요?  (TextInput, max60) │
│ 언제였어요?  (DateInput YYYY-MM-DD) │
│ 메모 (선택, max100)                 │
│             [취소][기록하기]        │
└──────────────────────────────────┘
```
- 제목 필수, 날짜 필수, 메모 선택
- 롱프레스 → 본인 기록이면 삭제 확인

## 비즈니스 룰
- **BR-FM1**: 제목 1~60자. 공백만 금지.
- **BR-FM2**: 날짜는 오늘 이전(과거)이어야 함. 미래 날짜 금지. 형식: YYYY-MM-DD.
- **BR-FM3**: 메모 최대 100자(선택).
- **BR-FM4**: 실시간 구독. 상대방이 추가하면 즉시 목록 갱신.
- **BR-FM5**: 삭제는 본인 기록만 가능 (보안 규칙도 동일).
- **BR-FM6**: 목록은 date ASC (오래된 것부터) 정렬.

## Edge case
| 상황 | 동작 |
|------|------|
| 미래 날짜 입력 | 저장 시 reject + Alert |
| 메모 101자 | TextInput maxLength 차단 |
| 제목 없이 저장 | 버튼 비활성화 |

## API 시그니처
```ts
// features/first-moments/index.ts

export interface FirstMoment {
  id: string;
  coupleId: string;
  addedBy: string;
  title: string;
  date: string;       // YYYY-MM-DD
  memo?: string;
  createdAt: Date;
}

export async function addFirstMoment(
  coupleId: string,
  addedBy: string,
  title: string,
  date: string,
  memo?: string,
): Promise<void>

export async function deleteFirstMoment(id: string): Promise<void>

export function subscribeFirstMoments(
  coupleId: string,
  cb: (moments: FirstMoment[]) => void,
): () => void
```

## Firestore 쓰기 패턴
```ts
await addDoc(collection(db, 'firstMoments'), {
  coupleId, addedBy, title, date,
  ...(memo ? { memo } : {}),
  createdAt: serverTimestamp(),
});
```

## 데이터 모델
### firstMoments
```
id: string
coupleId: string
addedBy: string         // 추가한 사용자
title: string           // max 60자
date: string            // YYYY-MM-DD
memo?: string           // max 100자 (선택)
createdAt: Timestamp
```

## 보안 규칙
```
match /firstMoments/{docId} {
  allow read:   if isMyCouple(resource.data.coupleId);
  allow create: if isMyCouple(request.resource.data.coupleId)
                && request.resource.data.addedBy == request.auth.uid
                && request.resource.data.title.size() <= 60;
  allow update: if false;
  allow delete: if resource.data.addedBy == request.auth.uid;
}
```

## 다른 기능과의 연계
- **실험실 탭**: `status: 'experimental'`, 사이드바 진입

## 테스트
- **단위**: `features/first-moments/__tests__/addFirstMoment.test.ts` — BR-FM1(60자/공백), BR-FM2(미래 날짜)
- **단위**: `features/first-moments/__tests__/subscribeFirstMoments.test.ts` — BR-FM4(실시간), BR-FM6(정렬)

## BR ↔ 테스트 매핑
| BR | 종류 | 위치 | 테스트 이름 |
|----|------|------|-------------|
| BR-FM1 | 단위 | features/first-moments/__tests__/addFirstMoment.test.ts | '[BR-FM1] 61자 reject / 공백 reject' |
| BR-FM2 | 단위 | features/first-moments/__tests__/addFirstMoment.test.ts | '[BR-FM2] 미래 날짜 reject' |
| BR-FM3 | 단위 | features/first-moments/__tests__/addFirstMoment.test.ts | '[BR-FM3] 메모 저장 확인' |
| BR-FM4 | 단위 | features/first-moments/__tests__/subscribeFirstMoments.test.ts | '[BR-FM4] 새 기록 추가 후 콜백 호출' |
| BR-FM5 | 단위 | features/first-moments/__tests__/addFirstMoment.test.ts | '[BR-FM5] deleteFirstMoment 호출 후 삭제' |
| BR-FM6 | 단위 | features/first-moments/__tests__/subscribeFirstMoments.test.ts | '[BR-FM6] date ASC 정렬 확인' |
