# 스펙: 실시간 채팅

> 짝 문서: `docs/architecture.md` (couples/{coupleId}/messages 서브컬렉션),
> `firestore.rules` (messages 블록), `storage.rules` (chat 이미지 경로),
> `docs/decisions.md` ADR-018 (채팅은 1차 core 기능).

## 개요
커플 두 명이 앱 안에서 텍스트와 이미지를 주고받는 실시간 채팅.
고정 탭 진입, 서브컬렉션 기반, 최신 50개 onSnapshot 구독.

## 사용자 스토리
- **US-1**: 텍스트를 입력해 상대방에게 메시지를 보낼 수 있다.
- **US-2**: 사진 라이브러리에서 이미지를 선택해 전송할 수 있다.
- **US-3**: 상대방 메시지는 즉시 화면에 나타난다 (onSnapshot).
- **US-4**: 전송 실패 시 입력창이 복원되거나 이미지 재시도 버튼이 표시된다.
- **US-5**: 날짜가 바뀌면 대화 사이에 날짜 구분선이 표시된다.

## 화면 흐름
```
(tabs)/chat.tsx
  └─ features/chat/ChatScreen
       ├─ 메시지 없음     → EmptyState "대화를 시작해보세요"
       ├─ 메시지 있음     → FlatList(inverted) + 날짜 구분선
       │    ├─ 말풍선(나): 오른쪽, accent 색
       │    └─ 말풍선(상대): 왼쪽, surface 색 + 이름 표시
       ├─ 이미지 전송 중  → 말풍선 위 반투명 오버레이 + ActivityIndicator
       ├─ 이미지 실패     → 오버레이 + "재시도" 버튼
       └─ 입력바: [이미지 버튼] [TextInput 멀티라인] [전송 버튼]
```

## 와이어프레임

### ChatScreen
```
┌─ 채팅 ────────────────────────────┐
│                                    │
│              ── 오늘 ──            │
│   [파트너 이름]                    │
│   ┌──────────────────┐            │
│   │ 상대방 메시지     │ 13:24      │
│   └──────────────────┘            │
│                                    │
│           ┌──────────────────┐    │
│  14:05    │   내 메시지       │    │
│           └──────────────────┘    │
│                                    │
│ 빈: 💬 "대화를 시작해보세요"       │
│                                    │
│ ┌──────────────────────────────┐  │
│ │ [📷] [입력창...]       [➤]  │  │
│ └──────────────────────────────┘  │
└────────────────────────────────────┘
```

## 비즈니스 룰
- **BR-1**: 메시지는 `couples/{coupleId}/messages` 서브컬렉션에 저장. coupleId는 부모 경로에서 상속.
- **BR-2**: `senderId`는 반드시 본인 uid — Security Rules가 강제 (`senderId == request.auth.uid`).
- **BR-3**: 텍스트 최대 1000자. 초과 시 `TextInput maxLength`로 입력 차단.
- **BR-4**: 전송 조건 — 텍스트가 비어있으면 `imageUrl`이 있어야 전송 가능. 둘 다 없으면 거부.
- **BR-5**: 최신 50개만 실시간 구독 (`orderBy createdAt desc, limit 50`). 무한 스크롤 없음.
- **BR-6**: 이미지 전송 시 긴 쪽 최대 1080px 압축 + quality 0.75 (재인코딩으로 메타데이터 제거). Storage 경로: `couples/{coupleId}/chat/{messageId}.jpg`.
- **BR-7**: 메시지 수정/삭제 불가 (`update: if false`, `delete: if false`).
- **BR-8**: 날짜 구분선 — "오늘" / "어제" / 같은 연도는 "M월 D일" / 다른 연도는 "YYYY년 M월 D일".
- **BR-9**: 텍스트 전송 실패 시 입력창에 원문 복원 + Alert. 이미지 전송 실패 시 말풍선에 재시도 버튼.

## Edge case
| 상황 | 동작 |
|------|------|
| 이미지 권한 거부 | Alert "사진 접근 권한이 필요해요" (재요청 X) |
| 텍스트 + 이미지 동시 전송 시도 | 이미지 버튼과 전송 버튼이 별도 — 동시 시도 불가 |
| 전송 중 재전송 시도 | `sending` 플래그로 차단 |
| 이미지 업로드 중 앱 백그라운드 | 업로드 완료 시 말풍선 정상 표시 (비동기 처리) |
| 50개 초과 이전 메시지 | 조회 불가 (무한 스크롤 미구현, 1차 범위 외) |

## API 시그니처 (TypeScript)
```ts
// features/chat/index.ts

interface Message {
  id: string;
  senderId: string;
  text: string;
  imageUrl?: string;
  createdAt: Date | null;
}

interface PendingImage {
  tempId: string;
  senderId: string;
  localUri: string;
  status: 'uploading' | 'failed';
}

export function subscribeMessages(
  coupleId: string,
  cb: (messages: Message[]) => void,
): () => void

export async function sendMessage(
  coupleId: string,
  senderId: string,
  text: string,
): Promise<void>

export async function sendImageMessage(
  coupleId: string,
  senderId: string,
  localUri: string,
): Promise<void>

// 안 읽은 메시지 배지용 (limit 10 — 10개 초과 시 부정확, 배지 목적으로 수용)
export function subscribeUnreadCount(
  coupleId: string,
  myUid: string,
  since: Date,
  cb: (n: number) => void,
): () => void
```

## Firestore 쓰기 패턴
```ts
// 텍스트 전송
await addDoc(collection(db, 'couples', coupleId, 'messages'), {
  senderId,
  text: text.trim(),
  createdAt: serverTimestamp(),
});

// 이미지 전송 — 문서 ID 미리 생성해 Storage 경로와 일치
const msgRef = doc(collection(db, 'couples', coupleId, 'messages'));
const storagePath = `couples/${coupleId}/chat/${msgRef.id}.jpg`;
await uploadBytes(ref(storage, storagePath), blob, { contentType: 'image/jpeg' });
const downloadURL = await getDownloadURL(ref(storage, storagePath));
await setDoc(msgRef, { senderId, text: '', imageUrl: downloadURL, createdAt: serverTimestamp() });
```

## 다른 기능과의 연계
- **홈 화면**: `subscribeUnreadCount`로 채팅 탭 배지 표시 (4단계).
- **사이드바**: 없음 — 채팅은 고정 탭.

## 테스트
- `subscribeMessages`: 최신 50개 역순 반환, coupleId 불일치 시 빈 배열.
- `sendMessage`: text trim 적용, 빈 문자열 전송 시 Firestore rules 거부.
- Security Rules: 다른 커플 메시지 read/write → PERMISSION_DENIED.

## BR ↔ 테스트 매핑
| BR | 종류 | 위치 | 테스트 이름 |
|----|------|------|-------------|
| BR-1 | 단위 | features/chat/__tests__/subscribeMessages.test.ts | '[BR-1] couples/{coupleId}/messages 서브컬렉션 구독' |
| BR-2 | 통합 | __tests__/integration/security-rules.test.ts | '[BR-2] 타인 senderId로 메시지 생성 → PERMISSION_DENIED' |
| BR-3 | 단위 | features/chat/__tests__/sendMessage.test.ts | '[BR-3] 1001자 텍스트 전송 거부' |
| BR-4 | 통합 | __tests__/integration/security-rules.test.ts | '[BR-4] 텍스트·imageUrl 모두 없으면 rules 거부' |
| BR-5 | 단위 | features/chat/__tests__/subscribeMessages.test.ts | '[BR-5] 최신 50개만 반환' |
| BR-6 | 단위 | features/chat/__tests__/sendImageMessage.test.ts | '[BR-6] 이미지 1080px 압축 후 Storage 업로드' |
| BR-7 | 통합 | __tests__/integration/security-rules.test.ts | '[BR-7] 메시지 update/delete → PERMISSION_DENIED' |
| BR-8 | 단위 | features/chat/__tests__/ChatScreen.test.tsx | '[BR-8] 날짜 구분선 오늘/어제/날짜 형식' |
| BR-9 | 단위 | features/chat/__tests__/ChatScreen.test.tsx | '[BR-9] 전송 실패 시 입력창 복원' |
