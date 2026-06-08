# 변경 이력

## 형식
`날짜 | 단계 | 내용`

---

## 2026-05-15 | 0단계 | 프로젝트 시작. 하네스 파일 초기화.
## 2026-05-21 | 계획 | docs: 전체 단계 로드맵 수립 (0~7단계), 캘린더 스키마 확장, 3단계 3a/3b/3c 분리, 4단계 푸시 알림 구조 명세, 6단계 30일 유예 로직 설계, ADR-006 추가
## 2026-05-21 | 1단계 | feat(security): firestore.rules / storage.rules / firebase.json 추가, invitations 컬렉션 분리(ADR-007/008), stage-1 완료 기준에 규칙 배포 포함
## 2026-05-21 | 하네스 | chore(harness): SSOT 정리(current.md=진행 SSOT, stage-N.md=계획서). stage-0.md 신규. CLAUDE.md 재작성(패키지 정책 명확화, 셸 스크립트는 사람용 보조). stage-1~7의 중복 SSOT 필드 제거.
## 2026-05-21 | 하네스 | chore(harness): ADR-009 타임존(Asia/Seoul) 고정, Zustand store 위치 규칙, 사진/이벤트 삭제 시 Storage 정리 규칙, 테스트 정책(core 모듈만 강제), 세션 종료 diff 확인 항목 추가. stage-0~2 에 해당 항목 반영.
## 2026-05-21 | 하네스 | chore(harness): 버전 관리(커밋) 규칙 추가 — 작업 단위 종료 시 무조건 커밋, 메시지 형식 정의, push/force/하드리셋 자동 실행 금지
## 2026-05-21 | 하네스 | docs(specs): 기능별 스펙 7종 추가 — auth-couple, calendar, vote, mood, bingo, home, lab-settings. 비즈니스 룰/edge case/API 시그니처/Firestore 쓰기 패턴/연계 명시. CLAUDE.md/HARNESS.md 참조 추가.
## 2026-05-26 | 하네스 | docs(frontend): design-system.md / frontend.md / dev-environment.md 3종 추가, ADR-010~014, 설정 파일 시드(.eslintrc/.prettierrc/.env.example/eas.json), stage-0/7 보강, CLAUDE.md 코딩 규칙 강화
## 2026-05-26 | 하네스 | refactor(harness): AI 자동화 친화로 압축 — CLAUDE.md 106→90줄, HARNESS.md 75→48줄. FEATURE_SPEC_TEMPLATE.md/TEST_STRATEGY.md/FRONTEND_RULES.md 룰북 3종 신규. 기존 frontend/testing/design-system/dev-environment 는 참고용으로 격하. 커밋 전 expo start 검증 삭제. 사용자 확인 절차를 core/couple/.env/rules/push 등 7개로 축소.
## 2026-06-01 | 하네스 | refactor(docs): 룰북↔디테일 중복 제거(2층 엄격 분리). 룰북=체크 가능한 한 줄 규칙+링크, 디테일=코드/표/사유. FRONTEND_RULES 116→54줄, TEST_STRATEGY 115→50줄. 강제 매트릭스를 TEST_STRATEGY 단일 소스로(testing.md 중복 행 제거). CLAUDE.md 코딩 룰에서 프론트/테스트 중복 걷어내고 룰북 포인터로 교체. git 저장소 초기화 + .gitignore 추가.
## 2026-06-01 | 하네스 | docs(architecture): Feature 명명/레지스트리 매핑 표 추가 — featureId=폴더명=kebab-case 단일 규칙 고정(date-decision/mood-share/couple-bingo). 즉흥 작명 방지. CLAUDE.md 코딩 룰에 명명 규칙 한 줄 추가.
## 2026-06-01 | 하네스 | chore(docs): 기획 원본 .docx 2종을 docs/_archive/ 로 이동(루트 정리, gitignore 유지). docs(security): ADR-016 수용된 보안 트레이드오프 명시(invite 브루트포스/moodChecks docId/users 생성 순서) — firestore.rules 주석만, 동작 불변.
## 2026-06-01 | 하네스 | test(strategy): 단계적 엄격도 추가 — experimental feature 는 단위 테스트만 강제, active 승격 시 매트릭스 full + BR 매핑 완성. core/* 는 완화 없음. CLAUDE.md 코딩 룰에 연계 한 줄.
## 2026-06-01 | 하네스 | docs(specs): 와이어프레임 체계 도입 — FEATURE_SPEC_TEMPLATE 에 "와이어프레임" 섹션 추가, 스펙 7종(auth-couple/calendar/vote/mood/bingo/home/lab-settings)에 화면별 ASCII 와이어프레임 백필. 레이아웃=와이어프레임 진실 소스 규칙을 FRONTEND_RULES 에 명시.
## 2026-06-01 | 8단계 | docs: App Store 공개 출시 준비 — stage-8.md 신설(Apple 심사 체크리스트), ADR-017(계정 삭제/Sign in with Apple/개인정보 처리방침/invite 길이), ADR-005 공개 배포로 갱신, HARNESS 로드맵에 8단계 추가. auth-couple/lab-settings 에 forward-reference.
## 2026-06-05 | 계획 | docs(decisions): ADR-018 — 1차 MVP 범위 축소(인증(이메일)/캘린더 2뷰/컨디션/홈+기념일 디데이/단순 해제/TestFlight 게이트) + 2차 분리(투표·빙고·원격푸시·실험실·30일유예·공개출시). HARNESS 로드맵에 1차/2차 범위 컬럼 반영. current.md/stage-1 갱신.
## 2026-06-05 | 버그수정 | fix(specs): auth-couple BR-3 트랜잭션 내 쿼리 제거 — `tx.get(query())` 미지원 → `getDocs`+`writeBatch`. BR-0 + `ensureCouple` 추가(발급 전 커플 선생성). home BR-8 클라이언트 직접 푸시 → Cloud Function onWrite 발송(2차). architecture: fcmToken→expoPushToken 통일, couples.anniversaryDate 추가, 사진 EXIF 제거 명시.
## 2026-06-05 | 계획 | chore(firestore): 복합 인덱스 7종 정의(firestore.indexes.json) — 1차(calendarEvents coupleId+date ASC/DESC, moodChecks coupleId+userId+date) + 2차(type별 뷰/voteSessions/bingoBoards/dateCandidates). architecture.md 인덱스↔쿼리 매핑 표 추가, stage-1 배포에 firestore:indexes 포함.
