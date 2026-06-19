# 스펙: 데이트 빙고 (3c 단계)

> 짝 문서: `tasks/stage-3c.md`, `architecture.md` (bingoBoards), `firestore.rules`.

## 개요
커플이 함께 채워가는 5x5 버킷리스트형 빙고. "한강 피크닉", "새벽 드라이브" 같은 항목을 둘 중 누구나 체크 가능. 빙고 1줄 달성 시 축하 화면.

## 사용자 스토리
- **US-1**: 함께 5x5 = 25개의 빙고 항목을 만든다 (기본 풀에서 선택 or 직접 입력).
- **US-2**: 두 사람이 함께 데이트한 항목을 체크하면 상대 화면에 즉시 반영.
- **US-3**: 가로/세로/대각선 1줄 완성 시 축하 애니메이션 + 로컬 알림.
- **US-4**: 빙고판 1개 완성 후 새 판 시작 가능.

## 화면 흐름
```
[빙고 탭]
  └── 활성 빙고판 없음    → [새 빙고판 만들기] → 항목 설정 화면 → 시작
  └── 활성 빙고판 있음    → 5x5 그리드
                              ├── 미체크 셀 탭 → 체크 (즉시 동기화)
                              └── 체크 셀 탭   → 체크 해제 (둘 다 가능)

[항목 설정 화면]
  ├── 기본 풀에서 25개 자동 채우기
  ├── 셀 탭 → 항목 편집
  └── [완료]
```

## 와이어프레임 (화면별 레이아웃)
### 빙고 그리드 (`features/couple-bingo/`)
```text
┌─ 데이트 빙고 ────────────────┐
│ 활성 없음 → EmptyState        │
│   [새 빙고판 만들기](Button)  │
│ 활성 있음 → 5x5 그리드        │
│  ┌─┬─┬─┬─┬─┐  셀 탭=체크/해제 │
│  ├─┼─┼─┼─┼─┤  체크=accent.warm│
│  ├─┼─┼─┼─┼─┤  완성셀=Sparkles │
│  ├─┼─┼─┼─┼─┤                 │
│  └─┴─┴─┴─┴─┘  진행률 N/25     │
└──────────────────────────────┘
```
### 항목 설정
```text
┌─ 항목 설정 ──────────────────┐
│ [기본 풀에서 25개 채우기]     │
│ 셀 탭 → 항목 편집 (50자, BR-8)│
│ 25칸 다 차야 [완료] 활성(BR-3)│
└──────────────────────────────┘
```
- 라인 완성 시 Lottie + 햅틱 success(BR-5/7). 셀 토글 = Reanimated scale 0.9→1.0.

## 빙고 모드
- **함께 빙고(couple)**: 커플이 하나의 보드를 공유. 둘 다 체크 가능. `boardType='couple'`
- **개인 빙고(personal)**: 각자 자신의 보드를 만들고 본인만 체크. `boardType='personal'`, `ownerUid` 지정. 상대방 보드는 실시간 구독 가능(읽기 전용). 빙고줄 VS 비교로 경쟁.

## 비즈니스 룰
- **BR-1**: 한 커플에 함께 빙고판은 최대 3개. 3개 초과 시 새 판 시작 거부. 탭으로 구분. 미완성이어도 "기록으로 넘기기"로 completed 처리 가능.
- **BR-P1**: 개인 빙고는 각자 별도 5x5 항목 등록. 서로 다른 항목 가능. `boardType='personal'`, `ownerUid=uid`.
- **BR-P2**: 개인 보드는 `ownerUid` 본인만 체크/해제 가능. 상대방 보드는 읽기 전용(Firestore rules + 앱 UX 양쪽 보장).
- **BR-P3**: 개인 빙고도 본인 기준 최대 3개 동시 활성. 상대방 보드 수는 무관.
- **BR-P4**: 상대방 개인 보드 실시간 구독 — `subscribePersonalBoards(coupleId, cb)` 반환값 중 `ownerUid !== myUid` 필터.
- **BR-P5**: 점수바 — 각 쪽 활성 보드의 `completedLines.length` 합산 표시.
- **BR-2**: 그리드 크기 5x5 고정. 향후 확장 시 ADR.
- **BR-3**: 항목 25개 채워지지 않은 상태에서는 시작 불가 (빈 셀 허용 안 함).
- **BR-4**: 체크/해제는 둘 다 가능. `checkedBy: { [itemId]: { uid, at } }` 로 누가 언제 체크했는지 보존.
- **BR-5**: 빙고 라인 감지 — 가로 5, 세로 5, 대각선 2 = 총 12 라인. 한 라인 완성 시 즉시 축하 트리거.
- **BR-6**: 라인 완성 후에도 계속 체크 가능. 전체 25칸 완성 시 "빙고판 완성" 별도 축하.
- **BR-7**: 축하 알림(로컬)은 라인 완성한 본인 기기에서만. 상대방에게는 푸시(4단계)로 별도 전송.
- **BR-8**: 항목 텍스트 50자 이내. 빈 텍스트 불가.

## Edge case
| 상황 | 동작 |
|------|------|
| 양쪽이 같은 셀을 동시에 체크 | 둘 다 성공. `checkedBy` 는 마지막 쓰기 기준 |
| 체크 직후 해제 (실수) | 그 셀 다시 미체크 상태 |
| 항목 설정 중 앱 종료 | 자동 저장 없음. 다음 진입 시 처음부터 (또는 임시 저장 옵션) |
| 빙고판 시작 후 항목 텍스트 수정 | 금지 (BR-7 일관성). 새 판으로만 변경 |
| 라인 동시 다중 완성 | 한 번에 축하 1회 + 어느 라인들인지 표시 |
| 25칸 완성 후 다시 시작 안 함 | 그리드는 그대로 보임. [새 판] 버튼 상시 노출 |

## API 시그니처 (TypeScript)
```ts
// features/couple-bingo/
interface BingoBoard {
  id: string;
  coupleId: string;
  status: 'active' | 'completed';
  items: string[];                          // 길이 25 고정
  checkedItems: Record<number, true>;       // index → true
  checkedBy: Record<number, { uid: string; at: Date }>;
  completedLines: number[];                 // 0~11 (12개 라인 인덱스)
  startedAt: Date;
  completedAt?: Date;
}

export async function startBoard(coupleId: string, items: string[]): Promise<string>
//   - 이전 활성 보드 자동 completed 처리
export async function toggleCell(boardId: string, uid: string, index: number): Promise<{ newLines: number[] }>
//   - 트랜잭션: checkedItems 토글 + checkedBy 갱신 + 라인 재계산
export function subscribeActiveBoard(coupleId: string, cb: (b: BingoBoard | null) => void): () => void
export function checkLines(checked: Record<number, true>): number[]   // pure 함수
```

## Firestore 쓰기 패턴
```ts
// 셀 토글 (BR-4, 라인 재계산까지 트랜잭션 안에서)
await runTransaction(db, async (tx) => {
  const snap = await tx.get(doc(bingoBoards, boardId));
  const data = snap.data() as BingoBoard;
  const now = data.checkedItems[index];
  const newChecked = { ...data.checkedItems };
  const newBy      = { ...data.checkedBy };
  if (now) { delete newChecked[index]; delete newBy[index]; }
  else      { newChecked[index] = true; newBy[index] = { uid, at: serverTimestamp() }; }
  const lines = checkLines(newChecked);
  const newLines = lines.filter(l => !data.completedLines.includes(l));
  tx.update(snap.ref, {
    checkedItems: newChecked, checkedBy: newBy, completedLines: lines,
    ...(Object.keys(newChecked).length === 25 && { status: 'completed', completedAt: serverTimestamp() }),
  });
  return { newLines };
});
```

## 다른 기능과의 연계
- **캘린더 (2단계)**: 셀 체크 시 "캘린더에도 추가할까요?" 옵션 — `general` 이벤트 자동 작성.
- **푸시 알림 (4단계)**: 라인 완성 시 상대방에게 "OO 이/가 빙고 한 줄을 채웠어요" 원격 알림.
- **실험실 (5단계)**: `status: 'experimental'` 등록.

## 테스트 (Jest)
- `checkLines`: 12개 라인 인덱스 정확성 (가로 5 / 세로 5 / 대각선 2) — pure 함수라 단위 테스트 쉬움.
- `toggleCell`: 체크 → 해제 → 다시 체크 시 `completedLines` 변화 추적.
- `startBoard`: 이전 활성 보드가 자동으로 `completed` 로 전환되는지.

## BR ↔ 테스트 매핑
| BR | 종류 | 위치 | 테스트 이름 |
|----|------|------|-------------|
| BR-1 | 단위 | features/couple-bingo/__tests__/startBoard.test.ts | '[BR-B1] 기존 활성 보드가 있어도 새 보드를 추가 생성한다 (최대 3개)', '[BR-B1] 활성 보드가 3개면 새 보드 시작 거부' |
| BR-P1 | 단위 | features/couple-bingo/__tests__/startBoard.test.ts | '[BR-P1] boardType=personal, ownerUid 지정으로 개인 보드 생성' |
| BR-P2 | 단위 | features/couple-bingo/__tests__/toggleCell.test.ts | (active 승격 시 추가) |
| BR-P3 | 단위 | features/couple-bingo/__tests__/startBoard.test.ts | '[BR-P3] 개인 보드 3개 초과 시 거부', '[BR-P3] 상대방 개인 보드 3개가 있어도 내 개인 보드는 생성 가능' |
| BR-2 | 단위 | features/couple-bingo/__tests__/schema.test.ts | '[BR-2] items.length가 25가 아니면 시작 거부 (26개)', '[BR-2] items.length가 25가 아니면 시작 거부 (24개)' |
| BR-3 | 단위 | features/couple-bingo/__tests__/startBoard.test.ts | '[BR-B3] 25개 미만이면 에러', '[BR-B3] 빈 항목(공백만) 포함 시 에러' |
| BR-4 | 단위 | features/couple-bingo/__tests__/toggleCell.test.ts | '[BR-4] 체크 시 checkedBy에 uid와 시각이 기록된다', '[BR-4] 체크 해제 시 checkedBy에서 해당 항목이 제거된다' |
| BR-5 | 단위 | features/couple-bingo/__tests__/checkLines.test.ts | '[BR-5] LINES 배열은 정확히 12개(가로5 + 세로5 + 대각2)', '[BR-5] 가로/세로/대각선 완성 감지' |
| BR-6 | 단위 | features/couple-bingo/__tests__/toggleCell.test.ts | '[BR-6] 25칸 모두 체크 시 status가 completed로 전환된다' |
| BR-7 | 단위 | features/couple-bingo/__tests__/toggleCell.test.ts | '[BR-7] 라인 완성 시 newLines 배열에 해당 라인 인덱스가 포함된다' (active 승격 시 햅틱 컴포넌트 테스트 추가) |
| BR-8 | 단위 | features/couple-bingo/__tests__/schema.test.ts | '[BR-8] 항목 텍스트 51자 초과 거부', '[BR-8] 항목 텍스트 정확히 50자는 허용' |
