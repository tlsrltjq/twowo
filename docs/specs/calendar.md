# 스펙: 캘린더 + 사진 (2단계)

> 짝 문서: `tasks/stage-2.md`, `architecture.md` (calendarEvents, photos 스키마),
> `firestore.rules`, `storage.rules`.

## 개요
하나의 `calendarEvents` 컬렉션에 모든 이벤트를 저장하고, **타입(date/exercise/general) 으로만 구분**한다.
캘린더 탭은 4개의 "뷰"로 전환되지만 데이터는 동일하다. 사진은 이벤트에 첨부된다.

## 사용자 스토리
- **US-1**: 커플 양쪽이 같은 월간 달력을 보고, 누가 추가하든 즉시 반영된다.
- **US-2**: 데이트 후 사진을 첨부하면 사진 뷰에서 인스타그램 격자로 모인다.
- **US-3**: 운동 뷰에서 이번 달 누적 운동 시간을 한눈에 본다.
- **US-4**: 데이트 뷰에서 분위기/평점이 기록된 데이트 타임라인을 본다.

## 화면 흐름
```
캘린더 탭 (뷰 전환 탭바: 📅 사진 🏃 💑)
  ├── 📅 월간 달력 → 날짜 탭 → 그 날 이벤트 목록 → 카드 탭 → 상세
  ├── 🖼️ 사진 그리드 → 사진 탭 → 풀스크린 → 좌우 스와이프
  ├── 🏃 운동 리스트 + 이번 달 합계
  └── 💑 데이트 타임라인 (최신순)

이벤트 작성 흐름
  [+] → 타입 선택(일정/운동/데이트) → 폼 → 사진 첨부 (카메라/라이브러리) → 저장
```

## 와이어프레임 (화면별 레이아웃)
### 캘린더 (뷰 전환, `(tabs)/calendar.tsx`)
```text
┌─ 캘린더  [📅][🖼️][🏃][💑] ──┐  ← 뷰 전환 탭바
│ 📅 월간 그리드 + 날짜 점       │  점색: date핑크/운동오렌지/일반회색
│    날짜 탭 → 그 날 이벤트 목록  │
│ 🖼️ 사진 그리드 (인스타식)      │
│ 🏃 운동 리스트 + 이번달 합계   │
│ 💑 데이트 타임라인 (최신순)    │
│ [+] FAB → 작성                │
│ 빈:EmptyState 로딩:Skeleton   │
│ Pull-to-refresh (리스트 뷰)   │
└──────────────────────────────┘
```
### 이벤트 작성/상세 (`event/new` modal · `event/[id]` push)
```text
┌─ 새 이벤트 ──────────────────┐
│ 타입: 일정/운동/데이트 (세그) │
│ 제목·날짜·장소·메모 (RHF+zod) │
│ 운동→exerciseData / 데이트→평점│
│ [사진 첨부] 카메라/라이브러리  │
│   진행률 표시(낙관 X) 최대20장 │
│ [저장] (Button pri, 스피너)   │
└──────────────────────────────┘
```
- 작성=modal, 상세=push. 동일 데이터소스라 뷰 전환 시 깜빡임 없음(BR/edge).

## 비즈니스 룰
- **BR-1**: 모든 이벤트는 `coupleId` 기준 공유. 개인 이벤트 개념 없음.
- **BR-2**: 이벤트 타입은 3개로 고정 — `date / exercise / general`. 향후 확장 시 `decisions.md`에 ADR.
- **BR-3**: 운동 이벤트는 `exerciseData` 필수 (`type === 'exercise'` 와 동시 강제).
- **BR-4**: 데이트 이벤트의 `dateData.rating` 은 1~5 정수. mood 는 4단계 enum.
- **BR-5**: 사진 첨부는 이벤트당 최대 20장. 21장 시도 시 UI 가드.
- **BR-6**: 사진 원본은 긴 쪽 1440px 리사이즈 + quality 0.75. 썸네일 400px / quality 0.6.
- **BR-7**: 사진 업로드 순서 — ① Storage 원본 ② Storage 썸네일 ③ Firestore `photos` 메타 ④ 이벤트의 `photoIds` 추가. ③ 까지 성공해야 UI 에 노출.
- **BR-8**: 이벤트 삭제 = `photoIds` 의 모든 photos 문서 + Storage 객체(원본+썸네일) + 이벤트 문서. `core/calendar/deleteEvent.ts` 가 책임 (architecture.md "사진/이벤트 삭제 규칙").
- **BR-9**: 캘린더 점 색상 — date=핑크, exercise=오렌지, general=회색. design-system 토큰 사용.
- **BR-10**: 사진 뷰 그리드 정렬은 `event.date` desc (촬영일 아님).

## Edge case
| 상황 | 동작 |
|------|------|
| 사진 업로드 중 앱 종료 | 다음 실행 시 `core/storage/cleanupOrphans()` 가 Firestore 없는 Storage 객체 삭제 |
| 같은 이벤트를 양쪽이 동시에 수정 | Firestore last-write-wins. `updatedAt` 으로 충돌 안내 (옵션) |
| 권한 거부 (카메라/사진 라이브러리) | 그 자리에서 다시 권한 요청 안내. 앱 크래시 금지 |
| 거대한 사진 (10MB+) | Storage Rules 가 차단. 사용자에게 "용량 초과" 메시지 |
| 사진 압축 실패 | 원본 그대로 업로드 시도. 그것도 실패하면 에러 토스트 |
| 네트워크 오프라인에서 이벤트 추가 | Firestore 오프라인 캐시로 임시 저장, 복귀 시 자동 동기화 |
| 뷰 전환 직후 깜빡임 | 동일 데이터 소스 사용으로 캐시 재활용. 별도 로딩 X |

## API 시그니처 (TypeScript)
```ts
// core/calendar/
type EventType = 'date' | 'exercise' | 'general';
type Mood = 'great' | 'good' | 'okay' | 'bad';

interface CalendarEvent {
  id: string;
  coupleId: string;
  createdBy: string;
  type: EventType;
  title: string;
  date: Date;
  endDate?: Date;
  placeName?: string;
  placeAddress?: string;
  memo?: string;
  photoIds: string[];
  tags?: string[];
  exerciseData?: { exerciseType: string; durationMinutes: number; distanceKm?: number; memo?: string };
  dateData?: { mood?: Mood; rating?: number };
  externalId?: string;
  externalSource?: 'google' | 'notion' | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function createEvent(input: Omit<CalendarEvent,'id'|'createdAt'|'updatedAt'|'photoIds'>): Promise<string>
export async function updateEvent(id: string, patch: Partial<CalendarEvent>): Promise<void>
export async function deleteEvent(id: string): Promise<void>   // photos + Storage 정리 포함
export function subscribeEvents(coupleId: string, range: { from: Date; to: Date }, cb: (events: CalendarEvent[]) => void): () => void
// 타입별 구독. maxCount=100 으로 무제한 read 방지. (coupleId+type+date DESC 복합 인덱스)
export function subscribeEventsByType(coupleId: string, type: string, cb: (events: CalendarEvent[]) => void, maxCount?: number): () => void
// 사진 탭 전용: 특정 날짜 이후 전체 타입 구독. (coupleId+date DESC 인덱스, 3종 병렬 구독 대체)
export function subscribeEventsSince(coupleId: string, since: Date, cb: (events: CalendarEvent[]) => void): () => void

// core/memory/ — 탭 전환 lazy 구독 훅 (coupleId=null 시 즉시 해제)
export function useCalendarEventsByType(coupleId: string | null, type: string): { events: CalendarEvent[]; loading: boolean }
export function usePhotoEvents(coupleId: string | null): { events: CalendarEvent[]; loading: boolean }  // 최근 2년, photoIds 있는 것만

// core/storage/
export async function uploadPhoto(
  localUri: string,
  ctx: { coupleId: string; eventId: string; currentPhotoCount: number; width?: number; height?: number }
): Promise<{ photoId: string; originalUrl: string; thumbUrl: string }>
export async function deletePhoto(photoId: string): Promise<void>   // 메타 + Storage 모두 삭제
export async function cleanupOrphans(coupleId: string): Promise<{ removed: number }>
```

## Firestore / Storage 쓰기 패턴
```ts
// 사진 1장 첨부 (BR-7 순서)
const photoId = uuid();
const originalPath = `couples/${coupleId}/events/${eventId}/${photoId}_original.jpg`;
const thumbPath    = `couples/${coupleId}/events/${eventId}/${photoId}_thumb.jpg`;

await uploadBytes(ref(storage, originalPath), originalBlob);   // ①
await uploadBytes(ref(storage, thumbPath),    thumbBlob);      // ②
await setDoc(doc(photos, photoId), {                            // ③
  eventId, coupleId,
  storagePath: originalPath, thumbnailPath: thumbPath,
  width, height, sizeBytes, source,
  createdAt: serverTimestamp(),
});
await updateDoc(doc(calendarEvents, eventId), {                 // ④
  photoIds: arrayUnion(photoId), updatedAt: serverTimestamp(),
});
```

## 다른 기능과의 연계
- **홈 화면 (4단계)**: 다가오는 일정 = `subscribeEvents` 의 오늘부터 7일 범위, 상위 3개.
- **3a (둘다좋아) 매칭 성공**: 결과를 `general` 이벤트로 자동 추가하는 옵션 (UI 선택지).
- **6단계 (커플 해제 30일 후)**: Scheduled Function 이 `couples/{coupleId}/` Storage 폴더를 통째 삭제.

## 테스트 (Jest)
- `deleteEvent`: 사진 3장 첨부된 이벤트 삭제 → photos 문서 3개 + Storage 객체 6개 모두 사라지는지 (에뮬레이터).
- `uploadPhoto`: 리사이즈/압축 결과 크기 한계, 썸네일 비율, MIME 검증.
- `cleanupOrphans`: Firestore 없는 Storage 객체만 삭제하고 정상 메타데이터는 보존.

## BR ↔ 테스트 매핑
| BR | 종류 | 위치 | 테스트 이름 |
|----|------|------|-------------|
| BR-1 | 통합 | __tests__/integration/calendar-share.test.ts | '[BR-1] 양쪽 coupleId 기준 동일 목록 구독' |
| BR-2 | 단위 | core/calendar/schema.test.ts | '[BR-2] type enum 3개 외 거부' |
| BR-3 | 단위 | core/calendar/schema.test.ts | '[BR-3] exercise 일 때 exerciseData 필수' |
| BR-4 | 단위 | core/calendar/schema.test.ts | '[BR-4] rating 1~5 정수, 그 외 거부' |
| BR-5 | 단위 | core/storage/upload.test.ts | '[BR-5] photoIds 20 초과 시 거부' |
| BR-6 | 단위 | core/storage/upload.test.ts | '[BR-6] 1440px / quality 0.75 결과 검증' |
| BR-7 | 통합 | __tests__/integration/photo-upload-order.test.ts | '[BR-7] Storage 원본→썸네일→메타→photoIds 순서' |
| BR-8 | 통합 | __tests__/integration/event-delete-cascade.test.ts | '[BR-8] 이벤트 삭제 시 사진 메타 + Storage 정리' |
| BR-9 | 수동 | qa-checklist | 캘린더 점 색상이 design-system 토큰과 일치 |
| BR-10 | 단위 | core/calendar/__tests__/subscribeEvents.test.ts | '[BR-10] 사진 뷰 정렬 = event.date desc' ✅ |
