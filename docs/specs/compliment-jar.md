# 스펙: 칭찬 저금통 (compliment-jar)

> 짝 문서: `architecture.md` (compliments), `firestore.rules`, `feature-registry/registry.ts`.

## 개요
서로에게 칭찬/감사 메시지를 저금통에 넣어두고 언제든 꺼내볼 수 있는 기능.
축적되는 칭찬이 관계의 긍정적 자산이 된다.

## 사용자 스토리
- **US-1**: 오늘 고마웠던 일, 칭찬하고 싶은 점을 상대에게 넣어둔다.
- **US-2**: 기분이 좋지 않거나 생각이 나면 저금통을 열어 쌓인 칭찬을 읽는다.
- **US-3**: 내가 쓴 칭찬과 상대가 써준 칭찬을 구분해서 볼 수 있다.

## 화면 흐름
```
[사이드바/실험실] → [ComplimentJarScreen]
  ├── 상단: 저금통 이미지(이모지) + 총 개수
  ├── 탭: 💝 받은 칭찬 | ✏️ 내가 쓴 칭찬
  ├── FlatList — ComplimentCard (텍스트 + 날짜)
  ├── 빈: EmptyState
  └── FAB(+) → 작성 모달
        └── TextInput → [저금하기] → 저장 후 목록 갱신
```

## 와이어프레임
### ComplimentJarScreen
```
┌─ 칭찬 저금통 ────────────────────┐
│ [← 뒤로]    칭찬 저금통  [공]    │
│ 🫙 우리가 쌓은 칭찬 N개          │
│ ┌───────────────────────────┐    │
│ │ 💝 받은 칭찬 | ✏️ 내가 쓴 │    │ ← 탭
│ └───────────────────────────┘    │
│ ─── FlatList ───                 │
│ [ComplimentCard]                 │
│  "오늘 밥 차려줘서 너무 고마워"  │
│   2026-06-09 · OO이 씀            │
│ ──────────────────               │
│ 빈: EmptyState(리본+문구)        │
│ 로딩: Skeleton 3개               │
│                           [＋]   │ ← FAB
└──────────────────────────────────┘
```
### 작성 모달 (BottomSheet 없이 Alert+TextInput 사용)
```
┌─ 칭찬 저금하기 ──────────────────┐
│ TextInput "상대에게 전하고 싶은…" │
│ 0/150                [취소][저금하기]│
└──────────────────────────────────┘
```
- 탭 전환: received(내게 온 것) / sent(내가 쓴 것)
- FAB: 새 칭찬 작성 (항상 표시, 탭 무관)

## 비즈니스 룰
- **BR-CJ1**: 칭찬 1개 = 최대 150자. 공백만 금지.
- **BR-CJ2**: 저장된 칭찬은 삭제 불가. 수정 불가. (모아두는 느낌)
- **BR-CJ3**: 수신자(toUid) = 상대방. 내가 쓰는 칭찬은 항상 상대방에게.
- **BR-CJ4**: 실시간 구독 — 상대가 새 칭찬을 쓰면 즉시 목록에 나타남.
- **BR-CJ5**: 목록은 최신순(createdAt DESC).

## Edge case
| 상황 | 동작 |
|------|------|
| 네트워크 단절 | 오프라인 캐시 반영, 복귀 시 동기화 |
| 150자 초과 | TextInput maxLength + 버튼 비활성화 |
| 파트너 없음 | coupleId 없으면 화면 진입 불가 |

## API 시그니처
```ts
// features/compliment-jar/index.ts

export interface Compliment {
  id: string;
  coupleId: string;
  fromUid: string;
  toUid: string;
  text: string;
  createdAt: Date;
}

export async function addCompliment(
  coupleId: string,
  fromUid: string,
  toUid: string,
  text: string,
): Promise<void>

export function subscribeCompliments(
  coupleId: string,
  cb: (compliments: Compliment[]) => void,
): () => void
```

## Firestore 쓰기 패턴
```ts
// auto-ID addDoc — 삭제/수정 없음
await addDoc(collection(db, 'compliments'), {
  coupleId, fromUid, toUid, text: text.trim(),
  createdAt: serverTimestamp(),
});
```

## 데이터 모델
### compliments
```
id: string              // auto-ID
coupleId: string
fromUid: string
toUid: string
text: string            // max 150자
createdAt: Timestamp    // 정렬 기준
```

## 보안 규칙
```
match /compliments/{docId} {
  allow read:   if isMyCouple(resource.data.coupleId);
  allow create: if isMyCouple(request.resource.data.coupleId)
                && request.resource.data.fromUid == request.auth.uid
                && request.resource.data.text.size() <= 150;
  allow update: if false;
  allow delete: if false;
}
```

## 다른 기능과의 연계
- **실험실 탭**: `status: 'experimental'`, 사이드바 진입

## 테스트
- **단위**: `features/compliment-jar/__tests__/addCompliment.test.ts` — BR-CJ1(150자/공백), BR-CJ3(toUid)
- **단위**: `features/compliment-jar/__tests__/subscribeCompliments.test.ts` — BR-CJ4(실시간), BR-CJ5(정렬)

## BR ↔ 테스트 매핑
| BR | 종류 | 위치 | 테스트 이름 |
|----|------|------|-------------|
| BR-CJ1 | 단위 | features/compliment-jar/__tests__/addCompliment.test.ts | '[BR-CJ1] 151자 reject / 공백 reject' |
| BR-CJ2 | 단위 | features/compliment-jar/__tests__/addCompliment.test.ts | '[BR-CJ2] addCompliment은 addDoc 사용 (수정/삭제 API 없음)' |
| BR-CJ3 | 단위 | features/compliment-jar/__tests__/addCompliment.test.ts | '[BR-CJ3] toUid 필드가 상대방 uid로 저장' |
| BR-CJ4 | 단위 | features/compliment-jar/__tests__/subscribeCompliments.test.ts | '[BR-CJ4] 새 칭찬 추가 후 콜백 호출' |
| BR-CJ5 | 단위 | features/compliment-jar/__tests__/subscribeCompliments.test.ts | '[BR-CJ5] createdAt DESC 정렬 확인' |
