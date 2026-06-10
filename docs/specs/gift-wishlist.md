# 스펙: 선물 위시리스트 (gift-wishlist)

> 짝 문서: `architecture.md` (wishlistItems), `firestore.rules`, `feature-registry/registry.ts`.

## 개요
상대방이 원하는 선물을 미리 알고 챙겨줄 수 있는 위시리스트 기능.
기념일/생일 전에 상대방 위시리스트를 보고 선물을 고른다.

## 사용자 스토리
- **US-1**: 갖고 싶은 것을 위시리스트에 추가해두면 상대방이 확인하고 선물로 준비할 수 있다.
- **US-2**: 상대방 위시리스트를 보며 선물 아이디어를 얻는다.
- **US-3**: 선물을 받으면 "받았어!" 버튼으로 완료 표시.

## 화면 흐름
```
[사이드바/실험실] → [GiftWishlistScreen]
  ├── 탭: 🎁 상대방 위시리스트 | ✏️ 내 위시리스트
  ├── FlatList — WishlistItem (이름·메모·가격대·받음여부)
  ├── 빈: EmptyState
  └── FAB(+, 내 탭에서만) → 입력 모달
        └── 이름, 메모(선택), 가격대(선택) → 저장
```

## 와이어프레임
### GiftWishlistScreen
```
┌─ 선물 위시리스트 ─────────────────┐
│ [← 뒤로]    선물 위시리스트       │
│ ┌─────────────────────────────┐  │
│ │ 🎁 상대방  | ✏️ 내 목록    │  │ ← 탭
│ └─────────────────────────────┘  │
│ [WishlistCard]                    │
│  🎀 에어팟 프로                   │
│  ~30만원대  · "화이트 색상이면 좋겠어" │
│  [받았어! ✅]  ← 상대 탭에서만   │
│                                   │
│ 빈: EmptyState                    │
│ 로딩: Skeleton 3개                │
│                          [＋](내 탭) │
└──────────────────────────────────┘
```
### 입력 모달
```
┌─ 갖고 싶은 것 추가 ──────────────┐
│ 이름* (max60)                     │
│ 메모 선택 (max100)                │
│ 가격대 선택 (max30)               │
│            [취소][추가하기]       │
└──────────────────────────────────┘
```

## 비즈니스 룰
- **BR-GW1**: 아이템 이름 1~60자. 공백만 금지.
- **BR-GW2**: 메모 최대 100자(선택), 가격대 최대 30자(선택).
- **BR-GW3**: 각 사람은 본인 위시리스트만 추가/삭제 가능.
- **BR-GW4**: "받았어!" = `received: true` 플래그. 상대방 탭에서만 버튼 노출, 본인이 클릭.
- **BR-GW5**: 실시간 구독. 상대방이 추가하면 즉시 탭에 반영.
- **BR-GW6**: 삭제는 본인 아이템만 (received 상태 무관).

## Edge case
| 상황 | 동작 |
|------|------|
| 이름 없이 저장 | 버튼 비활성화 |
| 이미 received된 항목 재클릭 | 토글 OFF (received: false 로 되돌림) |
| 파트너 없음 | coupleId 없으면 진입 불가 |

## API 시그니처
```ts
// features/gift-wishlist/index.ts

export interface WishlistItem {
  id: string;
  coupleId: string;
  addedBy: string;       // 이 아이템 주인 (원하는 사람)
  name: string;
  memo?: string;
  priceRange?: string;
  received: boolean;
  createdAt: Date;
}

export async function addWishlistItem(
  coupleId: string,
  addedBy: string,
  name: string,
  memo?: string,
  priceRange?: string,
): Promise<void>

export async function toggleReceived(id: string, received: boolean): Promise<void>

export async function deleteWishlistItem(id: string): Promise<void>

export function subscribeWishlist(
  coupleId: string,
  cb: (items: WishlistItem[]) => void,
): () => void
```

## Firestore 쓰기 패턴
```ts
// 추가
await addDoc(collection(db, 'wishlistItems'), {
  coupleId, addedBy, name, received: false,
  createdAt: serverTimestamp(),
  ...(memo ? { memo } : {}),
  ...(priceRange ? { priceRange } : {}),
});
// 받음 토글
await updateDoc(doc(db, 'wishlistItems', id), { received });
```

## 데이터 모델
### wishlistItems
```
id: string
coupleId: string
addedBy: string         // 아이템 소유자
name: string            // max 60자
memo?: string           // max 100자
priceRange?: string     // max 30자
received: boolean       // default false
createdAt: Timestamp
```

## 보안 규칙
```
match /wishlistItems/{docId} {
  allow read:   if isMyCouple(resource.data.coupleId);
  allow create: if isMyCouple(request.resource.data.coupleId)
                && request.resource.data.addedBy == request.auth.uid
                && request.resource.data.name.size() <= 60;
  // 받음 토글: 커플 멤버면 가능 (파트너가 "받았어!" 누름)
  allow update: if isMyCouple(resource.data.coupleId)
                && request.resource.data.addedBy == resource.data.addedBy
                && request.resource.data.name == resource.data.name;
  allow delete: if resource.data.addedBy == request.auth.uid;
}
```

## 다른 기능과의 연계
- **실험실 탭**: `status: 'experimental'`, 사이드바 진입

## 테스트
- **단위**: `features/gift-wishlist/__tests__/addWishlistItem.test.ts` — BR-GW1(60자), BR-GW3
- **단위**: `features/gift-wishlist/__tests__/subscribeWishlist.test.ts` — BR-GW5(실시간)

## BR ↔ 테스트 매핑
| BR | 종류 | 위치 | 테스트 이름 |
|----|------|------|-------------|
| BR-GW1 | 단위 | features/gift-wishlist/__tests__/addWishlistItem.test.ts | '[BR-GW1] 61자 reject / 공백 reject' |
| BR-GW2 | 단위 | features/gift-wishlist/__tests__/addWishlistItem.test.ts | '[BR-GW2] memo/priceRange 저장 확인' |
| BR-GW3 | 단위 | features/gift-wishlist/__tests__/addWishlistItem.test.ts | '[BR-GW3] addedBy 필드 확인' |
| BR-GW4 | 단위 | features/gift-wishlist/__tests__/addWishlistItem.test.ts | '[BR-GW4] toggleReceived true/false' |
| BR-GW5 | 단위 | features/gift-wishlist/__tests__/subscribeWishlist.test.ts | '[BR-GW5] 아이템 추가 후 콜백 호출' |
| BR-GW6 | 단위 | features/gift-wishlist/__tests__/addWishlistItem.test.ts | '[BR-GW6] deleteWishlistItem 후 삭제' |
