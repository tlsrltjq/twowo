# 스펙: 우리의 플레이리스트 (our-playlist)

> 짝 문서: `architecture.md` (playlistSongs 컬렉션), `firestore.rules`, `feature-registry/registry.ts`

## 개요
커플이 함께 듣던 노래들을 시대/기억과 함께 기록하는 공유 음악 다이어리. "그때 자주 듣던 노래"를 추가해두고 둘이 같이 추억할 수 있다.

## 사용자 스토리
- **US-1**: 커플로서, 우리가 함께 듣던 노래를 제목·아티스트·기억 메모와 함께 남기고 싶다.
- **US-2**: 커플로서, 상대방이 추가한 노래도 같이 볼 수 있어서 "아, 이 노래 기억나!" 하고 싶다.
- **US-3**: 커플로서, 내가 잘못 추가한 노래는 삭제하고 싶다.

## 화면 흐름
```
사이드바 → /(features)/our-playlist
  └─ OurPlaylistScreen
       ├─ 전체 곡 목록 (createdAt DESC)
       │    ├─ 로딩: Skeleton
       │    ├─ 빈:   EmptyState "아직 노래가 없어요"
       │    └─ SongCard (제목/아티스트/기간태그/메모/추가자)
       │         └─ 롱프레스 → Alert "삭제할까요?" (내가 추가한 것만)
       └─ FAB (+) → AddSongModal
            ├─ 제목 입력 (필수)
            ├─ 아티스트 입력 (필수)
            ├─ 기간 태그 (선택) — "2023 여름", "처음 만났을 때"
            ├─ 메모 (선택) — 이 노래와 함께한 기억
            └─ 저장 버튼
```

## 와이어프레임

### OurPlaylistScreen
```
┌─ 우리의 플레이리스트 ─────────────┐
│                                    │
│ ┌─ SongCard ───────────────────┐  │
│ │ 🎵 [제목]          [기간 태그] │  │
│ │    [아티스트]                  │  │
│ │    "[메모]"         [추가자]   │  │
│ └──────────────────────────────┘  │
│ (반복)                              │
│                                    │
│ 빈: EmptyState "아직 노래가 없어요"  │
│     "우리 노래를 추가해보세요 🎵"    │
│ 로딩: Skeleton 3개                 │
│                                    │
│                            [+ FAB] │
└────────────────────────────────────┘
```
- 롱프레스 SongCard → Alert "삭제할까요?" (내가 추가한 것만)
- FAB 탭 → AddSongModal

### AddSongModal
```
┌─ 노래 추가 ───────────────────────┐
│ 제목 *                             │
│ [TextInput placeholder="곡 제목"] │
│                                    │
│ 아티스트 *                         │
│ [TextInput placeholder="아티스트"] │
│                                    │
│ 기간 (선택)                        │
│ [TextInput "2023 여름, 처음 만났을 때…"] │
│                                    │
│ 기억 메모 (선택)         0/100     │
│ [TextInput multiline]              │
│                                    │
│ [취소]            [추가하기 Button]│
└────────────────────────────────────┘
```

## 비즈니스 룰

- **BR-1**: 제목은 1자 이상 80자 이하 필수.
- **BR-2**: 아티스트는 1자 이상 60자 이하 필수.
- **BR-3**: 기간 태그는 선택. 입력 시 30자 이하.
- **BR-4**: 메모는 선택. 입력 시 100자 이하.
- **BR-5**: 전체 곡 목록은 커플 공유 실시간 구독 (createdAt DESC).
- **BR-6**: 노래 삭제는 추가한 본인만 가능. 수정 불가 (삭제 후 재등록).

## Edge case

| 상황 | 동작 |
|------|------|
| 제목/아티스트 미입력 | 저장 버튼 비활성 또는 Toast "제목과 아티스트를 입력해 주세요" |
| 네트워크 단절 중 추가 | Firestore 오프라인 캐시로 pending 처리, 재연결 시 자동 sync |
| 남의 노래 롱프레스 | 삭제 Alert 표시 안 함 (조건부 렌더링) |
| 동시 추가 충돌 | addDoc 사용 (고유 ID 자동 생성) → 충돌 없음 |
| 기간 태그 공백만 입력 | trim 후 빈 문자열이면 null로 저장 |

## API 시그니처 (TypeScript)

```ts
// features/our-playlist/schema.ts
export const playlistSongInputSchema = z.object({
  coupleId: z.string().min(1),
  addedBy:  z.string().min(1),
  title:    z.string().min(1).max(80),
  artist:   z.string().min(1).max(60),
  period:   z.string().max(30).optional(),
  memo:     z.string().max(100).optional(),
});
export type PlaylistSongInput = z.infer<typeof playlistSongInputSchema>;

export interface PlaylistSong extends PlaylistSongInput {
  id:        string;
  createdAt: Date;
}

// features/our-playlist/index.ts
export async function addSong(input: PlaylistSongInput): Promise<PlaylistSong>
export async function deleteSong(songId: string, userId: string): Promise<void>
export function subscribePlaylist(
  coupleId: string,
  cb: (songs: PlaylistSong[]) => void,
): () => void
```

## Firestore / Storage 쓰기 패턴

```ts
// addSong: addDoc (고유 ID 자동 생성, 트랜잭션 불필요)
const ref = await addDoc(collection(db, 'playlistSongs'), {
  coupleId, addedBy, title, artist,
  period: period?.trim() || null,
  memo:   memo?.trim()   || null,
  createdAt: serverTimestamp(),
});

// deleteSong: deleteDoc (권한은 rules에서 addedBy == request.auth.uid 로 강제)
await deleteDoc(doc(db, 'playlistSongs', songId));

// subscribePlaylist: onSnapshot + orderBy('createdAt', 'desc')
```

## 데이터 모델

### playlistSongs
```
id:        string          // Firestore auto-id
coupleId:  string          // 보안 규칙용
addedBy:   string          // userId (삭제 권한 판별)
title:     string          // 1~80자
artist:    string          // 1~60자
period:    string | null   // 선택, 30자 이하 — "2023 여름"
memo:      string | null   // 선택, 100자 이하
createdAt: Timestamp
```

## 보안 규칙

```
match /playlistSongs/{docId} {
  allow read:   if canReadCoupleDoc();
  allow create: if isMyCouple(request.resource.data.coupleId)
                && request.resource.data.addedBy == request.auth.uid
                && request.resource.data.title.size() >= 1
                && request.resource.data.title.size() <= 80
                && request.resource.data.artist.size() >= 1
                && request.resource.data.artist.size() <= 60;
  allow update: if false;
  allow delete: if isMyCouple(resource.data.coupleId)
                && resource.data.addedBy == request.auth.uid;
}
```

## 다른 기능과의 연계
- **홈 화면**: 연계 없음 — 사이드바 진입 전용.
- **캘린더**: 해당 없음.

## 테스트

- **단위** `schema.test.ts` — BR-1/2/3/4 zod 유효성 검증
- **단위** `addSong.test.ts` — BR-1/2/5 addDoc 호출 확인, 결과 형태 검증
- **단위** `deleteSong.test.ts` — BR-6 deleteDoc 호출 확인

## BR ↔ 테스트 매핑

| BR | 종류 | 위치 | 테스트 이름 |
|----|------|------|-------------|
| BR-1 | 단위 | features/our-playlist/__tests__/schema.test.ts | '[BR-1] title 빈 문자열 → 거부', '[BR-1] title 80자 → 허용', '[BR-1] title 81자 → 거부' |
| BR-2 | 단위 | features/our-playlist/__tests__/schema.test.ts | '[BR-2] artist 빈 문자열 → 거부', '[BR-2] artist 60자 → 허용', '[BR-2] artist 61자 → 거부' |
| BR-3 | 단위 | features/our-playlist/__tests__/schema.test.ts | '[BR-3] period 30자 → 허용', '[BR-3] period 31자 → 거부' |
| BR-4 | 단위 | features/our-playlist/__tests__/schema.test.ts | '[BR-4] memo 100자 → 허용', '[BR-4] memo 101자 → 거부' |
| BR-5 | 단위 | features/our-playlist/__tests__/addSong.test.ts | '[BR-5] addSong → createdAt DESC로 저장', '[BR-5] subscribePlaylist → onSnapshot 호출' |
| BR-6 | 단위 | features/our-playlist/__tests__/deleteSong.test.ts | '[BR-6] deleteSong → deleteDoc 호출', '[BR-6] 다른 사람 노래 삭제 시도 → PermissionError' |
