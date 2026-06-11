# 스펙 문서 인덱스

기능별 동작 명세. **무엇을 만들지(stage-N.md)**, **어떻게 저장하는지(architecture.md)**, **누가 접근 가능한지(firestore.rules)** 와 별도로, **이 화면이 어떻게 동작해야 하는가** 를 정의.

## 읽는 순서
1. `architecture.md` — 데이터 모델 / 컬렉션 / 화면 흐름 큰 그림
2. `decisions.md` — 왜 그렇게 정했는지
3. 작업 중인 단계의 스펙 (아래 표)
4. `tasks/stage-N.md` — 그 단계의 체크박스 작업 목록

## 단계 ↔ 스펙 매핑
| 단계 | 스펙 파일 | 주요 컬렉션 |
|------|-----------|------------|
| 1단계 | [`auth-couple.md`](./auth-couple.md) | users / couples / invitations |
| 2단계 | [`calendar.md`](./calendar.md) | calendarEvents / photos |
| 3a 둘다좋아 | [`vote.md`](./vote.md) | dateCandidates / voteSessions |
| 3b 컨디션 | [`mood.md`](./mood.md) | moodChecks |
| 3c 빙고 | [`bingo.md`](./bingo.md) | bingoBoards |
| 4단계 홈/알림 | [`home.md`](./home.md) | (합성 view) |
| 5+6단계 실험실/설정 | [`lab-settings.md`](./lab-settings.md) | featureSettings / couples |
| 신규 자기전 한마디 | [`night-message.md`](./night-message.md) | nightMessages |
| 신규 칭찬 저금통 | [`compliment-jar.md`](./compliment-jar.md) | compliments |
| 신규 오늘 뭐 먹었어 | [`daily-food.md`](./daily-food.md) | foodLogs |
| 신규 처음 한 것들 | [`first-moments.md`](./first-moments.md) | firstMoments |
| 신규 선물 위시리스트 | [`gift-wishlist.md`](./gift-wishlist.md) | wishlistItems |
| 신규 오늘의 고마움 *(미구현)* | [`daily-gratitude.md`](./daily-gratitude.md) | gratitudeEntries |

## 공통 형식 (모든 스펙 파일)
- **개요** — 한 문단
- **사용자 스토리** — US-N 식별자
- **화면 흐름** — 텍스트 다이어그램
- **비즈니스 룰** — BR-N 식별자, 강제되는 동작
- **Edge case** — 표 형태
- **API 시그니처 (TypeScript)** — 모듈별 함수 시그니처
- **Firestore / Storage 쓰기 패턴** — 트랜잭션/순서가 중요한 케이스
- **다른 기능과의 연계** — 의존성 명시
- **테스트 (Jest)** — 핵심 시나리오 (실제 작성은 해당 단계에서)

## 스펙 수정 규칙
- 비즈니스 룰(BR-*) 추가/변경 시 → `CHANGELOG.md` 한 줄.
- 데이터 모델이 함께 바뀌면 → `architecture.md` 도 같이 갱신.
- 결정 사유가 필요한 변경이면 → `decisions.md` 에 ADR 추가.
