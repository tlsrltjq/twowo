# 기술 결정 기록 (ADR)

## ADR-001: Expo 선택 (SwiftUI 대신)
- **결정**: Expo (React Native) + TypeScript
- **이유**: 코딩은 Claude Code가 담당 → AI가 React/TypeScript를 SwiftUI보다 훨씬 잘 생성함. Xcode 환경 없이도 테스트 가능. Firebase 연동 문서 풍부.
- **트레이드오프**: 네이티브 성능 약간 낮음 (체감 차이 없음)

## ADR-002: Firebase 선택 (CloudKit 대신)
- **결정**: Firebase Firestore + Firebase Auth + Firebase Storage
- **이유**: 실시간 동기화 구현이 CloudKit보다 단순. 레퍼런스 문서 많음. 향후 Android 확장 시 그대로 사용 가능.
- **트레이드오프**: Apple 생태계 최적화는 CloudKit이 더 좋음

## ADR-003: Feature Sandbox 구조
- **결정**: 모든 실험 기능은 Feature Registry에 등록, status로 ON/OFF 관리
- **이유**: 100개+ 아이디어를 안전하게 테스트. 재미없는 기능은 코드 삭제 없이 hidden 처리.
- **규칙**: feature끼리 직접 참조 금지, core를 통해서만

## ADR-004: Zustand 선택 (Redux 대신)
- **결정**: Zustand
- **이유**: 소규모 프로젝트에 Redux는 과함. Zustand는 보일러플레이트 적고 Claude Code가 오류 없이 생성함.

## ADR-005: EAS Build
- **결정**: EAS Build → TestFlight
- **이유**: App Store 배포 없이 두 명(나 + 여자친구)만 설치하면 됨. TestFlight가 가장 간단.

## ADR-006: 2인 커플 기능과 다인 그룹 기능 분리
- **결정**: 커플(2인) 기능과 그룹(3인+) 기능을 완전히 분리된 데이터 모델로 운영
- **이유**: 둘다좋아, 오늘의 컨디션 등 핵심 기능이 2인 전제로 설계됨. 다인 지원을 위해 기존 구조를 바꾸면 불필요한 복잡도 증가.
- **규칙**:
  - 커플 기능: 기존 coupleId 기반, memberIds[2] 고정, 지금 계획 그대로
  - 그룹 기능: 나중에 Feature Registry에 experimental로 별도 추가 (groupId, memberIds[])
  - 두 모델은 서로 참조하지 않음
- **그룹 기능 후보** (배포 후 실험 예정): 공유 앨범, 그룹 캘린더, 여행 플래너, 더치페이 계산
- **트레이드오프**: 코드 중복 일부 발생할 수 있으나, 커플 앱 정체성과 기존 기능 안정성 유지가 더 중요


## ADR-007: 초대 코드를 별도 컬렉션(invitations)으로 분리
- **결정**: 초대 코드는 `couples` 문서 안 필드 대신 `invitations/{inviteCode}` 별도 컬렉션에 저장.
- **이유**: Firestore Security Rules는 query 조건을 직접 검증할 수 없어, 멤버가 아닌 사용자에게 `couples` list 권한을 안전하게 줄 수 없음. 코드를 별도 컬렉션의 문서 ID 로 만들면 인증된 사용자가 `get`만으로 안전하게 coupleId 를 받아올 수 있음.
- **join 흐름**:
  1. A가 invitations/{code} 생성 (createdBy=A, coupleId=A의 coupleId, expiresAt=+24h)
  2. B가 코드 입력 → invitations/{code} get → coupleId 획득
  3. B 트랜잭션: couples/{coupleId}.memberIds 에 B 추가 + invitations/{code} 삭제
- **트레이드오프**: 컬렉션 1개 추가. 대신 보안 규칙이 간단해지고 brute-force 방지(`list: false`) 가능.

## ADR-008: Firestore/Storage Security Rules 1단계 필수 포함
- **결정**: 1단계(인증+커플 연결) 완료 기준에 `firestore.rules` 및 `storage.rules` 배포 포함.
- **이유**: coupleId 기반 격리는 클라이언트 컨벤션이 아니라 서버측 규칙으로 강제되어야 함. 둘만 쓰는 앱이라도 토큰만 알면 임의 데이터 접근이 가능한 상태로 두지 않음.
- **규칙**: 새 컬렉션 추가 시 반드시 `firestore.rules`에 매칭 블록 추가 (없으면 마지막 `match /{document=**}`가 차단).


## ADR-009: 타임존은 Asia/Seoul 고정
- **결정**: 앱 내 모든 "날짜 키" 와 "당일 판정" 은 Asia/Seoul(KST) 기준.
- **이유**: `moodChecks` 문서 ID 가 `{coupleId}_{userId}_{YYYY-MM-DD}` 형식인데, 클라이언트 로컬 타임존을 그대로 쓰면 자정 직후 입력 시 다른 날짜로 저장되어 "당일 1회" 제약이 깨짐. 빙고 일자/캘린더 날짜 점 표시도 같은 문제.
- **구현**:
  - `core/utils/date.ts` 에 `getTodayKST(): string` (YYYY-MM-DD), `nowKST(): Date` 유틸 작성
  - Firestore `Timestamp` 는 UTC 그대로 저장하되, **사용자에게 보여주는 날짜/문서 ID 생성** 은 위 유틸 통해서만
  - 클라이언트 시계가 KST 가 아닌 경우(여행 등) 에도 동일하게 KST 기준 — 둘이 같은 "오늘" 을 공유하기 위함
- **트레이드오프**: 해외에서 둘이 떨어져 있으면 KST 자정 기준으로 동작 → 두 사람의 "오늘" 이 한국 시간이라는 약속이 깔림.


## ADR-010: 1차 릴리즈는 라이트 모드 전용
- **결정**: 다크모드 미지원으로 시작. 단 모든 색상은 토큰(`design-system/tokens.ts`)으로만 사용.
- **이유**: 둘만 쓰는 앱, 초기 출시 부담 감소. 토큰 구조만 유지하면 다크 토큰 추가는 추후 1~2일 작업.
- **재검토 시점**: 출시 후 1개월.

## ADR-011: 폰트는 Pretendard
- **결정**: 한글/영문 모두 Pretendard 4종(Regular/Medium/SemiBold/Bold) 사용.
- **이유**: 한글 가독성 우수, 무료 OFL, RN 에 임베드 쉽고 용량 적음.
- **대안**: 시스템 폰트(Apple SD Gothic Neo) — Android 일관성 떨어짐. Noto Sans KR — 자간 부담.

## ADR-012: 폼 처리는 react-hook-form + zod
- **결정**: 모든 폼 입력은 RHF, 유효성 검증은 zod 스키마.
- **이유**: 비제어 컴포넌트로 리렌더 최소화, 스키마 단일 진실 소스로 비즈니스 룰(BR-*)을 한 곳에서 강제 가능. RN 호환성 좋음.
- **규칙**: 도메인별 스키마는 `core/{도메인}/schema.ts` 에 둠.

## ADR-013: 아이콘은 lucide-react-native
- **결정**: 아이콘 라이브러리 = `lucide-react-native`.
- **이유**: 톤 일관성, 트리쉐이킹 잘 됨, 디자인 시스템 표(`design-system.md`)에 매핑 깔끔. `@expo/vector-icons` 는 패밀리 혼재.
- **트레이드오프**: 일부 한국적 아이콘 부족 — 그런 경우만 SVG 직접 추가.

## ADR-014: 데이터 페칭은 Firestore 직접 구독 (React Query 미사용)
- **결정**: Firestore `onSnapshot` 을 자체 훅(`useFirestoreDoc`, `useFirestoreQuery`)으로 감싸 사용. React Query/TanStack Query/SWR 도입 안 함.
- **이유**: 실시간 동기화가 핵심이라 캐시 무효화 전략이 React Query 와 충돌. 컬렉션 수가 적어 자체 훅으로 충분. 의존성 줄임.
- **재검토 시점**: 컬렉션 20개 넘어가거나, 복잡한 쿼리 조합이 필요해질 때.


## ADR-015: 테스트 전략 — 단위 + 통합 + 수동 E2E
- **결정**: 자동 테스트는 Jest 단위(mock) + Jest 통합(Firebase 에뮬레이터) 2계층. E2E 자동화(Detox/Maestro) 안 함. 대신 수동 체크리스트(`docs/qa-checklist.md`)로 대체.
- **이유**:
  - 둘만 쓰는 앱 → 자동 E2E 셋업/유지 비용이 효익을 초과.
  - 핵심 위험(데이터 무결성, Security Rules, 트랜잭션)은 통합 테스트로 충분히 커버 가능.
  - UI 시각 검증은 매 빌드마다 수동 점검 1회로 사람이 보는 게 더 정확.
- **강제 매트릭스**: `docs/testing.md` 의 표 참조 (`core/*` 데이터 모듈 YES, UI 강제 X).
- **커버리지**: % 강제 안 함. 참고용으로만 CI 출력.
- **CI**: GitHub Actions — static-checks → unit-tests → integration-tests 3단.
- **스펙 추적**: 모든 스펙(`docs/specs/*.md`) 끝에 BR ↔ 테스트 매핑 표. BR 추가 시 매핑 동시 추가.
- **재검토 시점**: 출시 후 6개월 또는 사용자 수가 늘어 안정성 이슈 발생 시.
