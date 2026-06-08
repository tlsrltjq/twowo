# 스펙: 실험실 + 설정 (5+6단계)

> 짝 문서: `tasks/stage-5.md`, `tasks/stage-6.md`, `architecture.md` (featureSettings, couples),
> `firestore.rules`, `decisions.md` ADR-003 (Feature Sandbox), ADR-006 (커플/그룹 분리).

## 개요
- **실험실 탭**: Feature Registry 에 등록된 실험 기능을 커플 단위로 ON/OFF.
- **설정 탭**: 커플 정보 / 프로필 / 로그아웃 / 커플 해제(30일 유예).
> 참고: 여기 "커플 해제"(status=disconnected, 30일 유예)와 **개인 계정 삭제는 별개**. 개인 계정 삭제(즉시 영구, Apple 심사 필수)는 8단계에서 추가 — `tasks/stage-8.md`, ADR-017-1.

## 사용자 스토리
- **US-1**: 새로 만든 실험 기능을 실험실 탭에서 토글 켜면 즉시 메인 탭에 노출, 상대방 화면에도 동기화.
- **US-2**: 재미없으면 토글 OFF — 해당 기능 화면 진입 차단, 데이터는 보존.
- **US-3**: 설정에서 내 닉네임을 바꾸면 상대방 화면에도 즉시 반영.
- **US-4**: 헤어졌을 때 "커플 연결 해제" → 30일간 데이터 보존. 그 안에 재연결하면 모든 데이터 그대로.
- **US-5**: 30일이 지나면 자동으로 모든 데이터(사진 포함) 영구 삭제.

## 화면 흐름
```
[실험실 탭]
  └── feature-registry 에서 status: 'experimental' 인 항목 목록
        ├── 토글 ON/OFF (Firestore featureSettings 즉시 반영, 양쪽 동기화)
        └── ON 상태 → [기능 화면으로 이동] 링크

[설정 탭]
  ├── 커플 정보 (D+N일, 상대 닉네임)
  ├── 내 프로필 (닉네임 수정)
  ├── 기능 관리 (실험실과 동일 토글, 편의용 중복)
  ├── 로그아웃
  └── 커플 연결 해제 (위험 영역)
        └── 1차 확인 → 2차 확인 → 해제 → "재연결 대기 화면"

[재연결 대기 화면]
  ├── 남은 일수 표시 ("28일 후 데이터가 삭제됩니다")
  ├── [상대와 재연결] → 코드 입력 / 새 코드 생성
  └── [완전 삭제하기] (즉시 영구 삭제 — 30일 유예 포기)
```

## 와이어프레임 (화면별 레이아웃)
### 실험실 (`(tabs)/lab.tsx`)
```text
┌─ 실험실 ─────────────────────┐
│ experimental 기능 목록        │
│  · 기능명   (Switch ON/OFF)   │
│  · ON → [기능 화면으로]       │
│ 양쪽 동기화 (featureSettings) │
│ 빈:EmptyState                 │
└──────────────────────────────┘
```
### 설정 (`(tabs)/settings.tsx`)
```text
┌─ 설정 ───────────────────────┐
│ 커플 정보 (D+N, 상대 닉)      │
│ 내 프로필 [닉네임 수정]       │
│ 기능 관리 (토글 중복)         │
│ [로그아웃]                    │
│ ── 위험 영역 ──               │
│ [커플 연결 해제] (Button danger)│
│   1차 → 2차 확인 → 해제        │
└──────────────────────────────┘
```
### 재연결 대기 (`disconnected.tsx`)
```text
┌─ 재연결 대기 ────────────────┐
│ "28일 후 데이터 삭제" (경고)  │
│ [상대와 재연결]  (Button pri) │
│ [완전 삭제하기]  (Button danger)│
└──────────────────────────────┘
```
- 위험 액션은 2단 확인 + 햅틱 warning. 해제 = status='disconnected'(문서 삭제 X).

## 비즈니스 룰
### 실험실
- **BR-L1**: 실험실 목록은 `feature-registry/registry.ts` 의 `status: 'experimental'` 만 표시. `active` 는 항상 켜짐, `hidden` 은 표시 안 함.
- **BR-L2**: 토글 상태는 `featureSettings/{coupleId}_{featureId}` 문서로 저장. 기본값(문서 없음) = OFF.
- **BR-L3**: 토글 변경은 커플 양쪽에 실시간 동기화. 한쪽이 켰는데 다른 쪽이 안 보이는 상황 없음.
- **BR-L4**: `hidden` 상태로 바뀐 기능의 데이터는 그대로 보존. `deprecated` 도 마찬가지 — 코드 삭제만 별도 단계로.

### 설정
- **BR-S1**: 닉네임 수정 = `users/{uid}.displayName` 업데이트. 본인만 수정 가능 (`firestore.rules`).
- **BR-S2**: 로그아웃 = Firebase Auth signOut + Zustand store 초기화 + 캐시 정리.

### 커플 해제 (위험 영역)
- **BR-D1**: 해제 = `couples/{id}` 업데이트 — `status: 'disconnected'`, `disconnectedAt`, `disconnectedBy`. 문서 삭제 X.
- **BR-D2**: 해제 직후 양쪽 앱은 자동으로 "재연결 대기 화면" 으로 전환 (`couples.status` 구독으로 감지).
- **BR-D3**: 30일 카운트다운 동안 모든 데이터(events/photos/moodChecks/...)는 그대로. 단, 새로운 데이터 작성은 금지 (UI 차단 + 규칙은 멤버이므로 허용은 함).
- **BR-D4**: 재연결 = `couples.status` 를 `'active'` 로 되돌리고 `disconnectedAt/By` 필드 제거. memberIds 는 그대로.
- **BR-D5**: 30일 경과 후 Scheduled Function 이 일괄 정리 — `calendarEvents`, `photos`, `moodChecks`, `dateCandidates`, `voteSessions`, `bingoBoards`, `featureSettings`, `invitations` 의 해당 coupleId 문서 + Storage `couples/{coupleId}/` 폴더 전체.
- **BR-D6**: D-3일에 양쪽에 로컬 알림 ("3일 후 데이터가 삭제됩니다").
- **BR-D7**: "완전 삭제하기" 누르면 30일 유예 포기, 즉시 BR-D5 와 동일 처리.

## Edge case
| 상황 | 동작 |
|------|------|
| 토글 ON 직후 네트워크 단절 | 오프라인 캐시 반영 → 복귀 시 동기화. 둘 다 동시 켜도 충돌 없음 |
| 한쪽이 토글 ON 직후 상대방이 OFF | last-write-wins. 토스트 안내 "방금 OO 가 OFF 했어요" |
| 해제 직후 상대방이 코드 새로 발급 시도 | `status: 'disconnected'` 라 차단. 재연결 흐름만 허용 |
| 30일 유예 중 한쪽이 다른 사람과 새 커플 만들기 시도 | 본인 `users.coupleId` 가 여전히 살아있어 차단 (BR-7 of auth-couple) |
| Scheduled Function 실행 실패 | 다음 자정 재시도. 무한 retry 방지를 위해 5회 후 알림 |
| Storage 폴더 일괄 삭제 도중 실패 | 부분 삭제된 채로 종료 → 다음 실행에서 잔여 정리 |

## API 시그니처 (TypeScript)
```ts
// core/features/
export function getRegistry(): AppFeature[]              // 정적 registry
export async function setFeatureEnabled(coupleId: string, featureId: string, enabled: boolean): Promise<void>
export function subscribeFeatureSettings(coupleId: string, cb: (settings: Record<string, boolean>) => void): () => void

// core/couple/
export async function updateProfile(uid: string, patch: { displayName?: string }): Promise<void>
export async function disconnectCouple(coupleId: string, byUid: string): Promise<void>
//   - 트랜잭션: status='disconnected', disconnectedAt=now, disconnectedBy=byUid
export async function reconnectCouple(coupleId: string): Promise<void>
//   - 30일 이내, 양쪽 동의 흐름은 UI 책임. 함수는 단순 상태 복귀
export async function purgeCoupleDataNow(coupleId: string): Promise<void>
//   - "완전 삭제하기" 직접 호출 또는 Scheduled Function 이 호출
```

## Scheduled Function (6단계, Firebase Blaze 플랜 필요)
```ts
// functions/scheduleCleanup.ts
export const cleanupExpiredCouples = onSchedule('every day 00:00', async () => {
  const cutoff = Date.now() - 30 * 86400 * 1000;
  const expired = await getDocs(query(
    couples, where('status', '==', 'disconnected'), where('disconnectedAt', '<', new Date(cutoff))
  ));
  for (const c of expired.docs) {
    await purgeCoupleDataNow(c.id);
  }
});
```
> Function 은 Admin SDK 사용 → Security Rules 우회 가능. 클라이언트 측 delete 금지는 그대로 유지.

## 다른 기능과의 연계
- **모든 feature 화면**: 진입 시 `subscribeFeatureSettings` 결과로 ON 인지 확인 후 렌더. OFF 이면 탭 자체에서 숨김.
- **홈 화면 (4단계)**: 해제된 커플은 홈 대신 재연결 대기 화면.
- **푸시 알림 (4단계)**: D-3일 알림은 로컬 알림 스케줄러로.

## 테스트 (Jest)
- `setFeatureEnabled`: 양쪽 클라이언트 구독에서 동일 시각 ±1초 내 갱신.
- `disconnectCouple` → `reconnectCouple`: 데이터 무손실, status 복귀.
- `purgeCoupleDataNow`: Firestore + Storage 모두 비어지는지 (에뮬레이터).
- 권한: 멤버 아닌 사용자가 `disconnectCouple` 호출 → PERMISSION_DENIED.

## BR ↔ 테스트 매핑
| BR | 종류 | 위치 | 테스트 이름 |
|----|------|------|-------------|
| BR-L1 | 단위 | core/features/getRegistry.test.ts | '[BR-L1] experimental 만 실험실 목록에 포함' |
| BR-L2 | 단위 | core/features/setFeatureEnabled.test.ts | '[BR-L2] 문서 없으면 OFF 기본값' |
| BR-L3 | 통합 | __tests__/integration/feature-toggle-sync.test.ts | '[BR-L3] 토글 변경 양쪽 동시 반영' |
| BR-L4 | 통합 | __tests__/integration/feature-hidden-data.test.ts | '[BR-L4] hidden 전환 시 데이터 보존' |
| BR-S1 | 통합 | __tests__/integration/security-rules.test.ts | '[BR-S1] 다른 사용자 닉네임 수정 → DENIED' |
| BR-S2 | 단위 | core/auth/signOut.test.ts | '[BR-S2] signOut 후 Zustand store clear' |
| BR-D1 | 통합 | __tests__/integration/disconnect-flow.test.ts | '[BR-D1] disconnect 트랜잭션 status/At/By' |
| BR-D2 | 컴포넌트 | app/disconnected.test.tsx | '[BR-D2] 양쪽 화면 자동 전환' |
| BR-D3 | 단위 | core/couple/disconnect.test.ts | '[BR-D3] disconnect 후 새 데이터 작성 UI 차단' |
| BR-D4 | 통합 | __tests__/integration/reconnect-flow.test.ts | '[BR-D4] 재연결 시 status active, 데이터 그대로' |
| BR-D5 | 통합 | __tests__/integration/purge-couple.test.ts | '[BR-D5] purgeCoupleDataNow 후 컬렉션/Storage 비어있음' |
| BR-D6 | 단위 | core/notifications/scheduleDelete.test.ts | '[BR-D6] D-3 로컬 알림 예약' |
| BR-D7 | 단위 | core/couple/purgeCoupleDataNow.test.ts | '[BR-D7] 즉시 삭제 시 BR-D5 와 동일 결과' |
