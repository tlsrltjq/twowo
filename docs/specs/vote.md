# 스펙: 둘다좋아 (3a 단계)

> 짝 문서: `tasks/stage-3a.md`, `architecture.md` (dateCandidates),
> `firestore.rules`, `decisions.md` ADR-003 (Feature Sandbox).

## 개요
각자 몰래 데이트 후보를 1개씩 고른 뒤, 양쪽 다 투표를 끝낸 순간 동시에 공개한다.
**핵심 가치**: "오늘 뭐 할까?" 의사 결정을 게임처럼 만든다.

## 사용자 스토리
- **US-1**: 후보 목록을 함께 만들고 양쪽이 동시에 본다.
- **US-2**: 각자 1개를 선택해도 상대방은 "투표 완료" 표시만 본다 (어떤 후보인지는 비밀).
- **US-3**: 양쪽 다 투표 완료 → 즉시 결과 공개. 같으면 매칭 성공, 다르면 둘 다 표시.
- **US-4**: 결과 화면에서 "다시 투표" 또는 "결과 보관(이벤트화)" 선택.

## 화면 흐름
```
[둘다좋아 탭]
  ├── 후보 목록 (제목/카테고리/장소) + [후보 추가] + [후보 삭제(스와이프)]
  ├── 내 선택 카드: 후보 탭 → 확정 → "투표 완료(?)"
  │     ↳ 상대 선택 카드는 "투표 완료" or "아직 투표 전" 만 표시
  └── 양쪽 투표 완료 감지 → 결과 화면 자동 전환
        ├── 매칭 성공  → 축하 + [캘린더에 추가] [다시 투표]
        └── 매칭 실패  → 양쪽 선택 공개 + [다시 투표]
```

## 와이어프레임 (화면별 레이아웃)
### 둘다좋아 메인 (`(tabs)/vote.tsx`)
```text
┌─ 둘다좋아 ───────────────────┐
│ [후보 목록]   (Card 리스트)   │
│  · 제목 / 카테고리 / 장소      │
│  · 스와이프 → 삭제 (BR-8)     │
│ [+ 후보 추가]  (Button pri)  │
│ ─────────────────────────────│
│ 내 선택 카드  | 상대 선택 카드 │
│ (후보 탭→확정)| 입력전:"아직"  │
│  "투표 완료?" | 입력후:"완료"  │
│ 빈:EmptyState(후보 0개) 로딩:Skeleton │
└──────────────────────────────┘
```
### 결과 (양쪽 완료 시 자동 전환)
```text
┌─ 결과 ───────────────────────┐
│ 성공: Lottie confetti + 후보  │
│   [캘린더에 추가][다시 투표]   │
│ 실패: 양쪽 선택 공개          │
│   [다시 투표] (Button pri)    │
└──────────────────────────────┘
```
- `voteSession.status='revealed'` 구독으로 결과 진입. 매칭 성공 시 햅틱 success.

## 비즈니스 룰
- **BR-1**: 후보는 커플 공유. 한 사람이 추가/삭제하면 상대방 화면에도 즉시 반영.
- **BR-2**: 각 후보 문서에 `votedBy: { [uid]: candidateId }` 가 아니라, **`candidateId` 별로 votedBy[] 배열**. 즉 "이 후보에 투표한 사람들" 목록.
- **BR-3**: 투표 상태는 `voteSession` 문서로 관리 — 한 라운드마다 1개. `voteSession.choices = { [uid]: candidateId }`.
- **BR-4**: 상대방의 `choices[uid]` 값은 클라이언트로 내려가되, **양쪽 다 입력 완료 전까지 UI 가 표시 안 함**. 보안 규칙으로는 막을 수 없는 영역 — 정직한 클라이언트 가정. (둘이 쓰는 앱이라 OK)
- **BR-5**: 한 라운드 완료(양쪽 투표 끝)되면 `voteSession.status = 'revealed'` 로 변경. 결과 공개.
- **BR-6**: "다시 투표" 누르면 새 `voteSession` 문서 생성, 후보 목록은 그대로 유지.
- **BR-7**: 매칭 성공 시 "캘린더에 추가" 누르면 그 후보의 `title/placeName` 으로 `general` 이벤트 자동 생성 (날짜는 사용자가 선택).
- **BR-8**: 후보 삭제 시 진행 중인 voteSession 에서 그 후보 선택은 무효화 (사용자에게 토스트).
- **BR-9**: 한 사람이 같은 후보에 두 번 투표하면 마지막 것이 유효.

## Edge case
| 상황 | 동작 |
|------|------|
| A가 투표한 직후 B가 후보 삭제 | 결과 공개 시 "선택했던 후보가 사라졌습니다" 안내 + 재투표 |
| 양쪽 동시에 같은 후보 삭제 | Firestore last-write-wins. 한 번만 삭제됨 |
| 네트워크 단절 중 투표 | 오프라인 캐시에 저장, 복귀 시 동기화 + 상대방 화면 갱신 |
| 후보 0개 상태에서 투표 시도 | UI 차단 (후보 추가 안내) |
| 한 사람이 라운드 진행 중 앱 종료 | 다시 들어와도 `voteSession` 상태 유지 |
| 매칭 성공 후 "캘린더 추가" 도중 실패 | 결과 화면은 유지. 다시 시도 버튼 |

## API 시그니처 (TypeScript)
```ts
// features/date-decision/
interface DateCandidate {
  id: string;
  coupleId: string;
  title: string;
  category?: 'food' | 'activity' | 'travel' | 'etc';
  placeName?: string;
  createdBy: string;
  createdAt: Date;
}

interface VoteSession {
  id: string;
  coupleId: string;
  status: 'in_progress' | 'revealed';
  choices: Record<string, string>;   // { [uid]: candidateId }
  startedAt: Date;
  revealedAt?: Date;
}

export async function addCandidate(input: Omit<DateCandidate, 'id'|'createdAt'>): Promise<string>
export async function removeCandidate(id: string): Promise<void>
export async function getOrCreateActiveSession(coupleId: string): Promise<VoteSession>
export async function castVote(sessionId: string, uid: string, candidateId: string): Promise<void>
//   - 양쪽 다 choices 채워지면 트랜잭션 내에서 status = 'revealed' 로 전이
export async function startNewRound(coupleId: string): Promise<string>   // 새 sessionId
export function subscribeSession(sessionId: string, cb: (s: VoteSession) => void): () => void
export function subscribeCandidates(coupleId: string, cb: (list: DateCandidate[]) => void): () => void
```

## Firestore 쓰기 패턴
```ts
// 투표 (양쪽 다 채워지면 자동 reveal)
await runTransaction(db, async (tx) => {
  const sess = await tx.get(doc(voteSessions, sessionId));
  const choices = { ...sess.data().choices, [uid]: candidateId };
  const filledByBoth = Object.keys(choices).length === 2;
  tx.update(sess.ref, {
    choices,
    ...(filledByBoth && { status: 'revealed', revealedAt: serverTimestamp() }),
  });
});
```

## 다른 기능과의 연계
- **캘린더 (2단계)**: 매칭 성공 시 `createEvent({ type: 'general', title: candidate.title, ... })` 호출.
- **홈 화면 (4단계)**: 진행 중 voteSession 이 있고 본인 미투표 시 "투표 대기 중" 배너 표시.
- **실험실 (5단계)**: 기능 등록 시 `status: 'experimental'`. 토글 OFF 시 탭에서 사라짐.

## 테스트 (Jest)
- `castVote`: 한 명만 투표 → status 유지, 둘 다 투표 → revealed 전이 (트랜잭션).
- `removeCandidate`: 진행 중 라운드의 choices 에 있던 후보 삭제 시 결과 처리.
- `startNewRound`: 이전 라운드는 revealed 로 종료된 상태에서만 새 라운드 가능.

## BR ↔ 테스트 매핑
| BR | 종류 | 위치 | 테스트 이름 |
|----|------|------|-------------|
| BR-1 | 단위 | features/date-decision/__tests__/subscribeCandidates.test.ts | '[BR-1] 후보 추가 후 구독 콜백에서 즉시 반영된다', '[BR-1] 다른 커플 후보는 콜백에 포함되지 않는다' |
| BR-2 | 단위 | features/date-decision/__tests__/schema.test.ts | '[BR-2] choices는 { [uid]: candidateId } 구조로 저장된다' |
| BR-3 | 단위 | features/date-decision/__tests__/schema.test.ts | '[BR-3] startNewRound이 생성하는 세션의 초기 choices는 빈 객체이다' |
| BR-4 | 단위 | features/date-decision/__tests__/castVote.test.ts | '[BR-4] 한 명만 투표한 상태에서 상대 choices는 노출되지 않는다 (in_progress 유지)' |
| BR-5 | 단위 | features/date-decision/__tests__/castVote.test.ts | '양쪽 투표 완료 시 status가 revealed로 전이한다' |
| BR-6 | 단위 | features/date-decision/__tests__/castVote.test.ts | '[BR-6] 새 라운드 시작 시 dateCandidates는 그대로 유지된다' |
| BR-7 | — | (active 승격 시 추가 — 캘린더 연계는 UI 레벨, 통합 테스트 필요) | — |
| BR-8 | 단위 | features/date-decision/__tests__/removeCandidate.test.ts | '[BR-8] 후보 삭제 시 dateCandidates에서 제거된다' |
| BR-9 | 단위 | features/date-decision/__tests__/castVote.test.ts | '[BR-9] 같은 사람이 재투표 시 마지막 후보가 유효하다' |
