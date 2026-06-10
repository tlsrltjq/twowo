# 커플 앱 (가칭: 둘다좋아)

여자친구와 단둘이 쓰는 커플 앱. Feature Sandbox 구조.

## 기술 스택
Expo (React Native / TypeScript) · Firebase (Auth/Firestore/Storage) · Zustand · EAS Build → TestFlight

## 디렉토리
```
app/                  Expo Router 화면 ((auth)/(tabs)/event/disconnected)
core/                 공통 모듈 (auth, couple, calendar, storage, notifications, stores, utils, firestore-hooks, features)
features/             실험 기능 (각 폴더 독립, registry 등록 필수)
feature-registry/     기능 ON/OFF (registry.ts, types.ts)
design-system/        tokens.ts (진실 소스) + 공통 컴포넌트
hooks/                공통 커스텀 훅
assets/               Pretendard 폰트, 이미지, lottie
docs/                 architecture / decisions / specs / _archive/qa-checklist (디테일 참고용)
tasks/                current.md (진행 SSOT) + stage-N.md (계획서)
__mocks__/, __tests__/, .github/workflows/
```

## 로드맵
> 정확한 진행 상태는 `tasks/current.md` 가 SSOT. 아이콘은 사람 요약.
> **범위는 ADR-018·ADR-019 기준** — 비용 발생 항목(TestFlight·Storage Blaze·Apple Developer)은 별도 준비 후 진행. 현재는 시뮬레이터 기반 기능 개발 중.

| 단계 | 이름 | 범위 | 상태 |
|------|------|:----:|------|
| 0 | 초기 세팅 | 1차 | ✅ |
| 1 | 인증 + 커플 연결 (**이메일만**, 구글 2차) | 1차 | ✅ |
| 2 | 캘린더(월간+사진 2뷰) + 사진(EXIF제거) | 1차 | ✅ |
| 3b | 오늘의 컨디션 | 1차 | ✅ |
| 4 | 홈 + 기념일 디데이 + **로컬 알림** | 1차 | ✅ |
| 6′ | 단순 커플 해제(유예 X) | 1차 | ✅ |
| 7 | UI 다듬기 + TestFlight *(비용 준비 후)* | 1차 | 🔄 |
| — | ─── 시뮬레이터 기반 2차 진입 중 ─── | | |
| 5 | 실험실 탭 | 2차 | ✅ |
| 3a | 둘다좋아 (투표) | 2차 | 🔄 선구현 |
| 3c | 데이트 빙고 | 2차 | 🔄 선구현 |
| — | 실시간 채팅 (사이드바 진입) | 2차 | 🔄 선구현 |
| 2′ | 캘린더 운동/데이트 뷰 | 2차 | ✅ |
| 4′ | 원격 푸시 Cloud Function *(Blaze 필요)* | 2차 | ⬜ |
| 6 | 커플 해제 30일 유예 + Scheduled Function *(Blaze 필요)* | 2차 | ⬜ |
| 8 | App Store 공개 출시 *(Apple Developer 필요)* | 2차 | ⬜ |

## 룰북 진입점 (AI 자동 작업 시 우선 참고)
- 행동 규칙: **CLAUDE.md** ← 세션 시작 시 자동 로딩
- 프론트엔드 룰: **FRONTEND_RULES.md**
- 테스트 룰: **TEST_STRATEGY.md**
- 새 기능 양식: **FEATURE_SPEC_TEMPLATE.md**

## 참고 (디테일이 필요할 때만)
- 데이터 모델: `docs/architecture.md`
- 기술 결정 사유: `docs/decisions.md` (ADR-001~018)
- 기능별 명세: `docs/specs/README.md`
- 디자인/프론트/테스트/환경/E2E 디테일: `docs/_archive/` (룰북으로 대체됨)
  - `design-system.md` / `frontend.md` / `testing.md` / `dev-environment.md` / `qa-checklist.md`
