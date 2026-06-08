# 스펙: 오늘의 컨디션 (3b 단계)

> 짝 문서: `tasks/stage-3b.md`, `architecture.md` (moodChecks),
> `firestore.rules`, `decisions.md` ADR-009 (타임존 KST).

## 개요
매일 서로의 컨디션(에너지/기분/만남 가능 여부)을 공유. 홈 화면 카드와 푸시 알림 트리거의 핵심 데이터 소스.

## 사용자 스토리
- **US-1**: 매일 한 번 내 컨디션을 입력하고 상대방에게 자동 공유.
- **US-2**: 상대방이 입력하면 홈 화면 카드가 즉시 바뀌고, 푸시 알림이 온다 (4단계).
- **US-3**: 당일 입력 후 마음이 바뀌면 23:59 (KST) 까지 수정 가능.
- **US-4**: 최근 7일 컨디션 추이를 한 줄로 본다.

## 화면 흐름
```
[컨디션 탭 or 홈에서 진입]
  ├── 오늘 미입력           → 입력 화면 (에너지/기분/만남/메모) → 저장
  ├── 오늘 입력 완료        → 내 입력 표시 + [수정]
  └── 상대방 카드            → 입력 전: "아직 입력 전" / 입력 후: 값 표시
[히스토리]
  └── 최근 7일 그리드 (오늘 포함, 둘의 컨디션 한 줄씩)
```

## 와이어프레임 (화면별 레이아웃)
### 컨디션 입력/조회 (`features/mood-share/`)
```text
┌─ 오늘의 컨디션 ──────────────┐
│ 내 카드                       │
│  에너지 1~5  (세그/슬라이더)   │
│  기분 great/good/okay/bad     │
│  만남 가능   (Switch)         │
│  메모        (TextField 0/200)│
│  [저장] (Button pri)          │
│  입력후 → 값 표시 + [수정]     │
│  23:59 KST 이후 → 수정 비활성  │
│ 상대 카드: "아직 입력 전" / 값 │
└──────────────────────────────┘
```
### 히스토리 (최근 7일)
```text
┌─ 최근 7일 ───────────────────┐
│ 날짜 | 나 | 상대  (7행 그리드)│
│ 과거 = 읽기전용 (BR-7)        │
│ 빈:EmptyState                 │
└──────────────────────────────┘
```
- 상대 카드 실시간 구독(BR-6). 저장 성공 햅틱 success. docId 는 KST 유틸로만(BR-1).

## 비즈니스 룰
- **BR-1**: 문서 ID 형식: `{coupleId}_{userId}_{YYYY-MM-DD}` — **YYYY-MM-DD 는 항상 KST 기준** (`core/utils/date.ts` 의 `getTodayKST()`, ADR-009).
- **BR-2**: 당일 1회 생성, 같은 날 안에서만 수정 가능. 23:59 KST 이후 그 날 컨디션은 잠금(`updateMood` 가 거부).
- **BR-3**: 다른 날 데이터를 클라이언트에서 작성/수정 시도 → 거부. (백필 금지)
- **BR-4**: 필드 — `energy: 1~5`, `mood: 'great'|'good'|'okay'|'bad'`, `canMeet: boolean`, `memo?: string (max 200자)`.
- **BR-5**: 메모 200자 초과 시 입력 차단 + 글자 수 카운터 표시.
- **BR-6**: 상대방의 `moodChecks` 는 실시간 구독. 상대 입력 직후 1초 내 내 화면에 반영.
- **BR-7**: 어제 이전 데이터는 읽기만 가능 (히스토리). UI 도 수정 버튼 비활성.
- **BR-8**: 보안 규칙(`firestore.rules`)은 `userId == auth.uid` 강제 — 본인 컨디션만 작성/수정.

## Edge case
| 상황 | 동작 |
|------|------|
| 자정 KST 직후 입력 | 새 날짜의 새 문서 (BR-1 의 `getTodayKST()` 가 안전 보장) |
| 사용자 기기 타임존이 UTC | 그래도 KST 기준 — 둘이 같은 "오늘" 공유 (ADR-009) |
| 오프라인 입력 | 캐시 저장 → 복귀 시 동기화. 단, 자정 넘은 후 동기화되면 거부 가능 → "어제로 저장하시겠어요?" 안내 |
| 상대방이 한 번도 입력 안 함 | 카드에 "아직 입력 전" 표시, 너지 알림은 4단계에서 |
| 양쪽이 같은 시각 동시 입력 | 각자 다른 문서 ID 이므로 충돌 없음 |
| 23:59 KST 직전 수정 시도 | 트랜잭션 시작 시점 기준으로 잠금 여부 판정 |

## API 시그니처 (TypeScript)
```ts
// features/mood-share/
type Mood = 'great' | 'good' | 'okay' | 'bad';
interface MoodCheck {
  id: string;        // `{coupleId}_{userId}_{YYYY-MM-DD}`
  coupleId: string;
  userId: string;
  date: string;      // 'YYYY-MM-DD' (KST)
  energy: 1 | 2 | 3 | 4 | 5;
  mood: Mood;
  canMeet: boolean;
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getTodayMood(coupleId: string, uid: string): Promise<MoodCheck | null>
export async function setTodayMood(input: Omit<MoodCheck, 'id'|'createdAt'|'updatedAt'|'date'>): Promise<MoodCheck>
//   - 같은 날 두 번 부르면 update, 첫 번째는 create
//   - 23:59 KST 지나면 throws MoodLockedError
export function subscribePartnerMoodToday(coupleId: string, partnerUid: string, cb: (m: MoodCheck | null) => void): () => void
export async function getRecent7Days(coupleId: string, uid: string): Promise<MoodCheck[]>
```

## Firestore 쓰기 패턴
```ts
import { getTodayKST } from 'core/utils/date';

const today = getTodayKST();                 // '2026-05-21' (KST)
const docId = `${coupleId}_${uid}_${today}`;
const ref = doc(moodChecks, docId);

await runTransaction(db, async (tx) => {
  const snap = await tx.get(ref);
  if (snap.exists() && snap.data().date !== today) {
    throw new Error('locked: cannot edit past day');
  }
  tx.set(ref, {
    coupleId, userId: uid, date: today,
    energy, mood, canMeet, memo: memo ?? null,
    createdAt: snap.exists() ? snap.data().createdAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
});
```

## 다른 기능과의 연계
- **홈 화면 (4단계)**: 오늘의 양쪽 컨디션을 한 카드에. 상대 입력 시 즉시 갱신.
- **푸시 알림 (4단계)**:
  - 로컬: 오후 8시 KST 까지 본인 미입력이면 "오늘 컨디션 알려주세요" 알림
  - 원격: 본인이 입력 완료하면 상대방 기기에 "OO 의 오늘 컨디션이 도착했어요" 알림
- **3a (둘다좋아)**: 상대방 `canMeet = false` 이면 후보 투표 UI 에 "오늘 어렵대요" 배너.

## 테스트 (Jest)
- `setTodayMood`: 같은 날 두 번째 호출 시 update, 다른 날 데이터 수정 시도 시 throw.
- `getTodayKST`: 23:30 / 23:59 / 00:01 (UTC와 비교) 케이스에서 모두 KST 기준 정확.
- 권한: 다른 userId 명의로 작성 시도 → PERMISSION_DENIED (에뮬레이터).

## BR ↔ 테스트 매핑
| BR | 종류 | 위치 | 테스트 이름 |
|----|------|------|-------------|
| BR-1 | 단위 | core/utils/date.test.ts | '[BR-1] getTodayKST() 다양한 타임존에서 KST 정확' |
| BR-2 | 단위 | features/mood-share/setTodayMood.test.ts | '[BR-2] 23:59 KST 지나면 MoodLockedError' |
| BR-3 | 단위 | features/mood-share/setTodayMood.test.ts | '[BR-3] 다른 날 데이터 수정 거부' |
| BR-4 | 단위 | features/mood-share/schema.test.ts | '[BR-4] energy 1~5, mood enum 4종' |
| BR-5 | 컴포넌트 | features/mood-share/MoodForm.test.tsx | '[BR-5] memo 200자 초과 시 입력 차단' |
| BR-6 | 통합 | __tests__/integration/mood-sync.test.ts | '[BR-6] 상대 입력 1초 내 내 화면 반영' |
| BR-7 | 컴포넌트 | features/mood-share/MoodHistory.test.tsx | '[BR-7] 어제 데이터 수정 버튼 비활성' |
| BR-8 | 통합 | __tests__/integration/security-rules.test.ts | '[BR-8] 다른 userId 명의 작성 → PERMISSION_DENIED' |
