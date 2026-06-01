# 기능 스펙 템플릿

> 새 기능 추가 시 이 파일을 복사해서 `docs/specs/{feature-name}.md` 로 만든다.
> 모든 섹션은 **선택이 아니라 필수**. 빈 섹션은 "해당 없음 — 이유" 라고 명시.
> 작성 후 `docs/specs/README.md` 의 매핑 표에 한 줄 추가.

---

# 스펙: [기능명] ([단계 번호])

> 짝 문서: `tasks/stage-{N}.md`, `architecture.md` (관련 컬렉션),
> `firestore.rules`, `decisions.md` ADR-XXX (있다면).

## 개요
[1~2 문장. 이 기능이 무엇이고 왜 필요한지.]

## 사용자 스토리
- **US-1**: [as a ..., I want ..., so that ...]
- **US-2**: ...

## 화면 흐름
```
[텍스트 다이어그램]
[탭/모달/스택 표시]
[조건 분기 화살표]
```

## 비즈니스 룰
> 모든 BR-N 은 zod 스키마 또는 테스트로 강제되어야 함.

- **BR-1**: [규칙. "...해야 한다 / 금지한다" 형식]
- **BR-2**: ...

## Edge case
> 정상 흐름이 아닌 모든 상황. 빠뜨리면 사용자 신고 들어옴.

| 상황 | 동작 |
|------|------|
| 네트워크 단절 | ... |
| 권한 거부 | ... |
| 동시 수정 충돌 | ... |
| 자정 직후 / 타임존 경계 | ... (해당 시) |
| 외부 서비스 응답 실패 | ... |

## API 시그니처 (TypeScript)
```ts
// core/{도메인}/ 또는 features/{이름}/
interface Xxx {
  id: string;
  // ...
}

export async function xxx(input: Xxx): Promise<...>
export function useXxx(...): { data; loading; error }
```

> 모든 시그니처는 `any` 금지. 에러는 명시적 union 타입 또는 throws 명세.

## Firestore / Storage 쓰기 패턴
> 트랜잭션이 필요한 곳, 순서가 중요한 곳, 보안 규칙과 결합되는 곳.

```ts
await runTransaction(db, async (tx) => {
  // ...
});
```

## 데이터 모델
> architecture.md 에 추가가 필요한 컬렉션/필드를 여기 먼저 정의 후, architecture.md 동기화.

### {컬렉션 이름}
```
id: string
coupleId: string         // 필수 — 보안 규칙 일관성
createdAt: Timestamp
// ...
```

## 보안 규칙
> firestore.rules 에 추가/수정할 매칭 블록 초안.

```
match /{컬렉션}/{docId} {
  allow read: if isMyCouple(resource.data.coupleId);
  allow write: if isMyCouple(...);
}
```

## 다른 기능과의 연계
- **{다른 기능}**: 의존 방향 + 호출 함수 / 구독 대상
- **홈 화면**: (해당 시) `useHomeData` 에 추가할 항목

## 테스트
> 핵심 시나리오 3~5개. 디테일은 BR↔테스트 매핑 표.

- **단위**: `{모듈}.test.ts` — [BR-X 검증 케이스]
- **통합**: `__tests__/integration/{flow}.test.ts` — [트랜잭션/규칙/실시간 동기화 케이스]
- **컴포넌트** (선택): `{Component}.test.tsx` — [상호작용 케이스]

## BR ↔ 테스트 매핑
> 모든 BR-N 이 매핑되어야 단계 완료. 빈 행 금지.

| BR | 종류 | 위치 | 테스트 이름 |
|----|------|------|-------------|
| BR-1 | 단위 | core/.../xxx.test.ts | '[BR-1] ...' |
| BR-2 | 통합 | __tests__/integration/... | '[BR-2] ...' |
| ... |

---

## 작성 후 체크리스트
- [ ] 모든 섹션 채움 (빈 섹션은 "해당 없음 — 이유" 명시)
- [ ] 데이터 모델 추가/변경 분이 architecture.md 에 반영
- [ ] 보안 규칙 변경 분이 firestore.rules 에 반영
- [ ] docs/specs/README.md 매핑 표에 한 줄 추가
- [ ] tasks/stage-{N}.md 의 목표/완료 기준에 이 기능 반영
- [ ] CHANGELOG.md 한 줄
