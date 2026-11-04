# 시스템 구조

## 앱 구조 원칙
- **Core는 단단하게**: User, Couple, CalendarEvent, Photo, FeatureSetting만
- **Feature는 가볍게**: 각 기능은 자기 데이터만, Core 의존만 허용
- **Feature Registry**: 모든 실험 기능은 registry에 등록 후 status로 관리

## 상태 관리 (Zustand) 위치 규칙
- **공유 store**(여러 화면이 같은 상태를 참조): `core/stores/{도메인}.store.ts`
  - 예: `core/stores/auth.store.ts`, `core/stores/couple.store.ts`
- **단일 화면 전용 상태**: 그 화면이 속한 폴더 안 `store.ts` 로 둠 (예: `app/(tabs)/calendar/store.ts`)
- **feature 내부 상태**: `features/{기능}/store.ts` — 다른 feature 가 import 하면 안 됨 (CLAUDE.md 규칙)
- **feature 끼리 데이터를 공유해야 한다면** 반드시 `core/stores/` 또는 `core/{도메인}/` 을 통해서. 직접 import 금지.
- 홈 화면(4단계) 같은 합산 화면은 각 feature 의 `getXxxForCouple(coupleId)` 같은 **순수 함수 API 만** 호출하고, store 는 core 의 것을 씀.


## Feature 상태 흐름
```
experimental → active (재밌으면 승격)
experimental → hidden (재미없으면 숨김, 코드 유지)
hidden → deprecated (완전 제거 예정)
```

## Firebase Firestore 컬렉션

### couples
```
id: string
memberIds: string[1..2]   // 생성 직후 [userId1], 초대 완료 후 [userId1, userId2]
createdAt: Timestamp       // 커플 연결(문서 생성) 시각
anniversaryDate?: Timestamp // 사용자 지정 기념일(사귄 날). 디데이 기준 (home BR-2). 미설정 시 createdAt 폴백

// 커플 연결 해제 관련 (6단계)
status: 'active' | 'disconnected'  // 기본값: 'active'
disconnectedAt?: Timestamp          // 해제 시각 (해제 시에만 존재)
disconnectedBy?: string             // 해제한 userId (해제 시에만 존재)
// disconnectedAt 기준 30일 경과 시 Scheduled Function이 모든 데이터 삭제
```
> 초대 코드는 `couples` 안에 두지 않고 별도 `invitations` 컬렉션으로 분리 (ADR-007).
> 이유: Security Rules에서 멤버가 아닌 사용자에게 couples 컬렉션 list 권한을 줄 수 없기 때문.

### invitations
```
id: string                // = 6자리 inviteCode (문서 ID 자체가 코드)
coupleId: string          // 어떤 커플의 초대인지
createdBy: string         // 발급한 userId
createdAt: Timestamp
expiresAt: Timestamp      // TTL (권장 24시간)
```
> join 흐름: 상대방이 코드 입력 → `invitations/{code}` get 으로 coupleId 획득 →
> 트랜잭션으로 `couples/{coupleId}.memberIds`에 본인 추가 + `invitations/{code}` 삭제.

### users
```
id: string
coupleId: string | null   // null = 커플 미연결. create 시 반드시 null (rules 강제). join/create 트랜잭션의 update 경로로만 설정 가능
displayName: string
activeInviteCode?: string // 현재 유효한 초대 코드 (재발급 시 이전 코드 삭제용 GET 기반)
```
> `expoPushToken`은 `userTokens` 컬렉션으로 분리 (ADR-022). `users/{uid}` 는 파트너가 읽을 수 있으므로 token 은 포함하지 않는다.

### userTokens
```
expoPushToken: string     // Expo Push token. 본인(isMe)만 read/write 가능
uid: string
updatedAt: Timestamp
```
> Cloud Functions이 원격 푸시를 보낼 때 admin SDK 로 이 컬렉션을 읽는다 (2차, home BR-8).

### calendarEvents
```
id: string
coupleId: string          // 커플 공유 기준
createdBy: string         // 작성자 userId
type: 'date' | 'exercise' | 'general'  // 이벤트 타입

// 공통 필드
title: string
date: Timestamp
endDate?: Timestamp       // 종일 or 시간대 이벤트
placeName?: string
placeAddress?: string     // 나중에 지도 연동 대비
memo?: string
photoIds: string[]        // 썸네일 포함 사진 목록
tags?: string[]           // 자유 태그 (향후 필터용)

// 운동 이벤트 전용 (type === 'exercise'일 때만)
exerciseData?: {
  exerciseType: string    // 'running' | 'cycling' | 'hiking' | 'gym' | 기타
  durationMinutes: number
  distanceKm?: number
  memo?: string
}

// 데이트 이벤트 전용 (type === 'date'일 때만)
dateData?: {
  mood?: 'great' | 'good' | 'okay' | 'bad'  // 그날 분위기
  rating?: number         // 1~5점
}

// 확장 예비 필드 (향후 구글/노션 연동 대비)
externalId?: string       // 외부 캘린더 이벤트 ID
externalSource?: string   // 'google' | 'notion' | null

createdAt: Timestamp
updatedAt: Timestamp
```

### photos
```
id: string
eventId: string
coupleId: string
originalUrl: string       // 큰 이미지 참조 'fsphoto:{coupleId}/{photoId}' (ADR-032). 예전 데이터는 Storage URL
thumbUrl: string          // 썸네일 data URL 'data:image/jpeg;base64,…' (≈400px, 리스트 표시용)
storagePath?: string      // (구) Storage 원본 경로 — ADR-032 이전 데이터에만 존재
thumbnailPath?: string    // (구) Storage 썸네일 경로
width: number             // 원본 가로 px (compress 후 실측)
height: number            // 원본 세로 px
createdAt: Timestamp
```

### couples/{coupleId}/photoData (서브컬렉션, ADR-032)
```
data: string              // base64 JPEG (data URL 접두어 없음, 90만 자 이하)
width: number
height: number
createdBy: string         // 올린 사람 uid
createdAt: Timestamp
```
> 큰 이미지 한 장 = 문서 하나. 다른 문서는 'fsphoto:{coupleId}/{photoId}' 참조로 가리킨다.
> 일정 사진 원본, 채팅 이미지, 오늘의 밥 사진이 여기 저장된다. 썸네일은 부모 문서에 data URL 로 직접 저장.
> Security Rule: get/create/delete 는 isMyCouple(coupleId), create 는 createdBy == 본인, update·list 금지.

### featureSettings
```
coupleId: string
featureId: string
enabled: boolean
```

### couples/{coupleId}/messages (서브컬렉션)
```
id: string                // 자동 생성 문서 ID
senderId: string          // 작성자 userId
text: string              // 메시지 본문 (1~1000자)
createdAt: Timestamp
```
> 서브컬렉션으로 coupleId를 부모에서 상속. 최신 50개만 onSnapshot 구독.
> Security Rule: isMyCouple(coupleId) + senderId == 본인 uid.

## 사진 업로드 전략 (ADR-032: Firestore 저장)
- **라이브러리 선택** (expo-image-picker): 선택 후 expo-image-manipulator 로 압축하며 `base64: true` 로 바로 인코딩
  - 큰 이미지: 긴 변 1280px 이하, 품질 0.7 → base64 90만 자를 넘으면 품질·크기를 단계적으로 낮춤 (`core/photos`)
  - 썸네일: 긴 변 400px, 품질 0.6 → 부모 문서(`photos.thumbUrl`)에 data URL 로 직접 저장
- **EXIF(GPS 등) 제거 필수**(1차 MVP, ADR-018): manipulateAsync JPEG 재인코딩 시 자동 제거.
- 큰 이미지는 `couples/{coupleId}/photoData/{photoId}` 에 저장하고 참조 `fsphoto:{coupleId}/{photoId}` 를 필드에 둔다.
- 화면은 `core/photos` 의 `PhotoImage`(참조·data URL·http URL 모두 처리)로 그린다.

### 사진/이벤트 삭제 시 정리 규칙
- **개별 사진 삭제 시**: `photos` 문서 + 참조된 `photoData` 문서 삭제 + 이벤트의 `photoIds` 배열에서 제거.
- **이벤트 삭제 시**: 해당 이벤트의 `photoIds[]` 에 든 모든 `photos` 문서와 그 `photoData` 를 함께 삭제.
- (구) Storage 객체 삭제는 ADR-032 이전 데이터에만 시도하며 실패해도 무시한다(결제 계정 종료로 접근 불가).
- **커플 해제 30일 경과 시**: Scheduled Function(Blaze 필요)이 동작하지 않으므로 현재는 자동 정리 없음.


## 캘린더 뷰 구조
캘린더 탭은 동일한 calendarEvents 데이터를 **뷰만 전환**해서 보여줌.
데이터를 모드별로 분리하지 않음 (한 이벤트가 여러 뷰에 동시에 표시 가능).

| 뷰 | 설명 | 필터 조건 | 구독 함수 |
|----|------|----------|----------|
| 📅 캘린더 뷰 | 월간 달력, 날짜에 이벤트 점 표시 | 전체 type, 월 범위 | `subscribeEvents(range)` |
| 🖼️ 사진 뷰 | 사진 그리드 (인스타그램 형식) | photoIds 있는 이벤트만, 최근 2년 | `subscribeEventsSince(since)` |
| 🏃 운동 뷰 | 운동 기록 리스트 + 간단 통계 | type === 'exercise', 최근 100개 | `subscribeEventsByType('exercise')` |
| 💑 데이트 뷰 | 데이트 타임라인 | type === 'date', 최근 100개 | `subscribeEventsByType('date')` |

> **Lazy 구독**: 각 뷰는 활성화된 탭에서만 coupleId를 전달해 구독한다 (`null` 전달 시 즉시 해제).
> 비활성 탭은 Firestore 연결을 유지하지 않으므로 불필요한 read 비용이 발생하지 않는다.

> **향후 확장**: 구글 캘린더 / 노션 연동은 externalId, externalSource 필드로 대비.
> 연동 기능 자체는 Feature Registry에 experimental로 추가 예정.

## Feature 명명 / 레지스트리 매핑 (단일 진실 소스)
> **규칙**: `featureId` (registry 키) === `features/{폴더}` 폴더명 === **kebab-case 영문**. 셋은 항상 동일 문자열.
> 새 feature 추가 시 **이 표에 먼저 한 줄** 등록 → 그 다음 폴더/스펙 생성. 폴더명을 즉흥적으로 짓지 않는다.

| 기능(한글) | `features/` 폴더 = featureId | 탭/진입점 | Firestore 컬렉션 | status 초기값 |
|------------|------------------------------|-----------|------------------|:-------------:|
| 채팅               | `chat`             | `(tabs)/chat.tsx`              | couples/{id}/messages                 | active       |
| 둘다좋아           | `date-decision`    | 사이드바 → `(features)/vote`   | dateCandidates, voteSessions          | experimental |
| 오늘의 컨디션      | `mood-share`       | 홈 카드 + `(tabs)/mood`        | moodChecks                            | experimental |
| 데이트 빙고        | `couple-bingo`     | 사이드바 → `(features)/bingo`  | bingoBoards                           | experimental |
| 자기 전 한 마디    | `night-message`    | 사이드바 → `(features)/night-message` | nightMessages                  | experimental |
| 칭찬 저금통        | `compliment-jar`   | 사이드바 → `(features)/compliment-jar` | compliments                   | experimental |
| 오늘의 밥          | `daily-food`       | 사이드바 → `(features)/daily-food` | foodLogs                          | experimental |
| 우리가 처음 한 것들 | `first-moments`   | 사이드바 → `(features)/first-moments` | firstMoments                   | experimental |
| 선물 위시리스트    | `gift-wishlist`    | 사이드바 → `(features)/gift-wishlist` | wishlistItems                  | experimental |
| 오늘의 고마움      | `daily-gratitude`  | 사이드바 → `(features)/daily-gratitude` | gratitudeEntries             | experimental |
| 우리의 플레이리스트 | `our-playlist`    | 사이드바 → `(features)/our-playlist`   | playlistSongs                | experimental |

> 라우트명이 폴더명과 다른 경우: `couple-bingo` → `bingo.tsx`, `date-decision` → `vote.tsx` (Expo Router 경로 제약으로 단축).

> 홈 / 채팅 / 캘린더 / 컨디션 / 설정은 **고정 탭**(`app/(tabs)/`) — registry 미등록.
> 실험/보조 기능은 사이드바(햄버거 메뉴)로 진입 — 탭에 등록하지 않음.
> 합산 화면(홈)은 각 feature 의 순수 함수 API(`getXxxForCouple`)만 호출 (CLAUDE.md: features 직접 import 금지).

## 기능별 서브컬렉션 (features가 직접 관리)
| 기능 | 컬렉션 | 주요 필드 |
|------|--------|----------|
| 둘다좋아 | dateCandidates | coupleId, title, category, votedBy[] |
| 둘다좋아 | voteSessions | coupleId, status, choices, startedAt, revealedAt? |
| 오늘의 컨디션 | moodChecks | coupleId, userId, energy, mood, canMeet, memo |
| 데이트 빙고 | bingoBoards | coupleId, boardType('couple'/'personal'), ownerUid(personal만), status, items[], checkedItems{}, checkedBy{}, completedLines[], startedAt, completedAt? |
| 자기 전 한 마디 | nightMessages | coupleId, userId, type(night/morning), text, date |
| 칭찬 저금통 | compliments | coupleId, fromUid, toUid, text, createdAt |
| 오늘 뭐 먹었어 | foodLogs | coupleId, userId, mealType, name, date |
| 우리가 처음 한 것들 | firstMoments | coupleId, addedBy, title, date, memo |
| 선물 위시리스트 | wishlistItems | coupleId, addedBy, name, url?, received |
| 오늘의 고마움 | gratitudeEntries | coupleId, userId, date, message |
| 우리의 플레이리스트 | playlistSongs | coupleId, addedBy, title, artist, period?, memo?, createdAt |

## 메인 탭 구조
| 탭 | 화면 | 주요 기능 |
|----|------|----------|
| 홈 | 오늘 요약 | 컨디션 공유, 다가오는 일정(7일/3개), 사이드바 진입 |
| 채팅 | 실시간 채팅 | 커플 메시지, 말풍선 UI, 이미지 전송 |
| 캘린더 | 뷰 전환형 캘린더 | 달력/사진/운동/데이트 뷰, 이벤트·사진 CRUD |
| 컨디션 | 오늘의 컨디션 | 에너지/기분 입력, 상대방 확인, 7일 히스토리 |
| 실험실 | 기능 토글 | experimental 기능 ON/OFF, 사이드바 표시 제어 |
| 설정 | 앱 설정 | 커플 정보, 프로필 수정, 로그아웃, 커플 해제 |

> 보조 기능(빙고, 둘다좋아 등)은 홈 화면 우상단 햄버거(≡) → 우측 사이드바에서 진입.

## 온보딩 플로우
```
앱 실행
  ↓
Firebase Auth 로그인 (이메일 or 구글)
  ↓
coupleId 있음? → 메인 화면
  ↓ 없음
커플 연결 화면
  ├── 초대 코드 생성 → 상대에게 공유
  └── 코드 입력 → 연결 완료 → 메인 화면
```


## Firestore 복합 인덱스 (`firestore.indexes.json`)
> 단일 필드(예: `invitations.createdBy`, `photos.eventId`)는 자동 인덱싱 → 복합 인덱스 불필요.
> 아래는 **복합 인덱스만** 정의. 빈 컬렉션에는 즉시 빌드되므로 1차에 2차 인덱스를 함께 배포해도 무해.
> 배포: `firebase deploy --only firestore:indexes` (rules 배포와 함께, stage-1/2).

| 인덱스 (필드 순서) | 쓰는 쿼리 | 범위 |
|--------------------|-----------|:----:|
| `calendarEvents` (coupleId ASC, date ASC) | 월간 뷰 날짜 범위(`date >= from && date <= to`) + 홈 다가오는 일정(`date >= 오늘`, asc, limit 3) | 1차 |
| `calendarEvents` (coupleId ASC, date DESC) | 사진 뷰 정렬(`subscribeEventsSince` — `event.date` desc, calendar BR-10) | 1차 |
| `moodChecks` (coupleId ASC, userId ASC, date DESC) | 컨디션 최근 7일(`getRecent7Days`, mood US-4) | 1차 |
| `calendarEvents` (coupleId ASC, type ASC, date DESC) | 운동 뷰(`type=='exercise'`) / 데이트 뷰(`type=='date'`) | 2차 |
| `voteSessions` (coupleId ASC, status ASC, startedAt DESC) | 활성 세션 조회(`status=='in_progress'`, 최신) | 2차 |
| `bingoBoards` (coupleId ASC, status ASC) | 활성 보드 조회(`status=='active'`) | 2차 |
| `dateCandidates` (coupleId ASC, createdAt ASC) | 후보 목록(coupleId + 생성순) | 2차 |

> 컨디션 "오늘/상대" 조회는 docId(`{coupleId}_{userId}_{YYYY-MM-DD}`) 직접 get → 인덱스 불필요(ADR-009).
> 새 쿼리에서 `FAILED_PRECONDITION (requires an index)` 가 나오면 콘솔 링크로 추가 후 이 표에 한 줄 기록.

## Security Rules (요약)
세부 규칙은 루트의 `firestore.rules`, `storage.rules` 파일이 진실 소스.

| 컬렉션 | read | write |
|--------|------|-------|
| users | 본인 + 같은 커플 상대방 | 본인. **create 시 coupleId==null 강제**. update 시 coupleId 변경은 `getAfter(couples).memberIds` 로 멤버십 증명 필수 (위조 차단) |
| userTokens | 본인만 | 본인만 (파트너 접근 완전 차단) |
| couples | memberIds 멤버 (또는 size==1 오픈 커플) | 초대 join(size 1→2) 또는 멤버가 **3가지 연산만**: `anniversaryDate` 변경 / disconnect / reconnect. `memberIds·createdAt` 불변 |
| invitations | 인증된 사용자 누구나 (코드 자체가 비밀, list 금지) | 발급자 본인(create). 삭제는 발급자 **또는 `getAfter(couples).memberIds` 에 속하는 join 완료자** — 제3자 DoS 차단 |
| calendarEvents | 내 coupleId 와 일치 | 내 coupleId 와 일치 |
| photos | 내 coupleId 와 일치 | 내 coupleId 와 일치 |
| featureSettings | 내 coupleId 와 일치 | 내 coupleId 와 일치 (delete 금지) |
| nightMessages | 내 coupleId 와 일치 | create: 본인 userId. update: **userId·coupleId·date·type 불변** (메타 위변조 금지) |
| dateCandidates / voteSessions / moodChecks / bingoBoards | 내 coupleId 와 일치 | 내 coupleId 와 일치 |
| 그 외 모든 경로 | 차단 | 차단 |

- moodChecks 는 본인 userId 문서만 create/update 가능.
- couples / featureSettings / moodChecks 는 클라이언트 delete 금지 (30일 유예 + Scheduled Function 만).
- Storage `couples/{coupleId}/...` 경로는 동일 coupleId 사용자만, 이미지 MIME + 10MB 이하.
- `couples/{coupleId}/photoData` 는 동일 커플 멤버만 get/create/delete, update·list 금지, base64 크기 상한 (ADR-032).
