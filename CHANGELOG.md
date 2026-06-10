# 변경 이력

## 형식
`날짜 | 단계 | 내용`

---

## 2026-06-10 | 캘린더 추가 뷰 | feat(calendar): 운동(🏃)/데이트(💑) 뷰 추가. subscribeEventsByType(coupleId+type+date복합인덱스) + useCalendarEventsByType 훅. ViewTab 4종(달력|운동|데이트|사진). TypeEventCard UI.
## 2026-06-10 | 실험실 탭 | feat(lab): core/features(getRegistry/setFeatureEnabled/subscribeFeatureSettings) + app/(tabs)/lab.tsx + 탭바 FlaskConical 추가 + 사이드바 활성 기능만 표시. 테스트 8종 green (BR-L1/L2/L3). registry mood-share→active, couple-bingo/date-decision experimental 등록.
## 2026-06-10 | 계획 갱신 | chore(plan): 비용 발생 항목(TestFlight·Storage·Apple Developer) 보류(ADR-019). 시뮬레이터 전용 계획 수립 — 실험실 탭→UI 완성도→캘린더 추가 뷰. HARNESS·decisions 갱신.
## 2026-06-10 | 컨디션 실시간 | fix(home): 내 컨디션 getTodayMood(일회성)→subscribeMyMoodToday(onSnapshot) 전환. 컨디션 탭 입력 후 홈 탭 돌아오면 즉시 반영.
## 2026-06-10 | UI 버그 | fix(ui): event 3화면 SafeAreaView — 상태바 겹침·뒤로가기 수정. fix(router): _layout (features) 등록 — 사이드바 빙고/투표 진입 수정. fix(firestore): photoIds undefined→[] 정규화 — 이벤트 상세 크래시 수정.
## 2026-06-10 | auth 레이스 수정 | fix(auth): signup/login setUser+setCoupleId 명시적 동기화 후 navigate. fix(auth): couple-connect user!.uid null-assertion 제거. docs: current.md 7단계 수정, HARNESS 아이콘 갱신, stage-7 링크 수정, auth-couple.md createInvite 반환 타입+Google 2차 표시.
## 2026-06-10 | E2E 두계정 | fix(rules): moodChecks 등 미존재 문서 read permission-denied 수정(canReadCoupleDoc). fix(auth): signup/login 명시적 navigate. feat(e2e): Maestro 5종 플로우. testID 추가(screen-*/btn-*). 컨디션/캘린더/채팅 동기화 1초 이내 확인.
## 2026-06-10 | UI 완성도 | feat(chat): 읽음 배지(최대9, 포커스시 초기화). feat(home): NextEventCard→이벤트상세 네비. feat(settings): 상대방 닉네임 표시. fix(calendar): updateEvent undefined→deleteField. fix(calendar): createEvent undefined placeName/memo 수정.
## 2026-06-10 | 홈+캘린더 | fix(calendar): addDoc undefined 필드 오류(placeName/memo) 수정. feat(home): NextEventCard(D-Day 배지/타입 이모지/장소명). feat(assets): 앱 아이콘·스플래시 — 두 하트 커플 모티프.
## 2026-06-10 | 빙고+둘다좋아 | feat(couple-bingo): 5x5 빙고판(설정/게임/빙고감지/완성). feat(date-decision): 후보관리+투표+자동공개. 사이드바에서 두 기능 모두 진입 가능.
## 2026-06-10 | 채팅+사이드바 | feat(chat): 실시간 채팅(서브컬렉션, 말풍선 UI) + 우측 사이드바(햄버거 메뉴) 추가. 탭 5개(홈|채팅|캘린더|컨디션|설정). 보조기능은 사이드바에서 진입.
## 2026-06-10 | 버그 수정 | fix(couple): createInvite Firestore LIST 쿼리→activeInviteCode GET 방식. fix(tabs): 로그아웃 후 로그인 리다이렉트. testID 추가(E2E 검증). Maestro 코드 생성 PASS / 로그아웃 리다이렉트 PASS.
## 2026-06-09 | 7단계 진행 | chore(eas): EAS 프로젝트 초기화(projectId 연결). Expo Go 실기기 QR 스캔 확인. TestFlight는 Apple Developer Program 가입 후 진행.
## 2026-06-09 | 5단계 완료 | feat(stage-5): 설정 탭(닉네임/기념일/로그아웃/커플 해제) + core/couple/disconnect(BR-D1/D4) + _layout BR-D2 구독. 테스트 3종 green. tsc 0 errors.
## 2026-06-09 | 4단계 완료 | feat(stage-4): 홈 화면(D+N일/컨디션/일정) + core/notifications(권한/Push Token/로컬 알림). 테스트 13종 green. 시뮬레이터 E2E 확인.
## 2026-06-09 | 3b단계 완료 | feat(stage-3b): mood-share 구현 완료. fix(auth): firebase/auth → @firebase/auth RN 빌드로 AsyncStorage persistence 수정. 시뮬레이터 E2E 확인.
## 2026-06-09 | 3b단계 | feat(stage-3b): mood-share 구현 — schema/API/MoodScreen/탭/registry. 50/50 green.
## 2026-06-09 | 2단계 완료(Storage 대기) | feat(stage-2): deleteEvent BR-8 테스트 + 사진 전체화면 뷰어 + useEventPhotos 훅 + 이벤트 수정 화면. 33/33 green. Storage 배포는 Blaze 업그레이드 후.
## 2026-06-09 | 2단계(진행) | feat(stage-2): core/calendar + core/storage + 캘린더 화면 + 이벤트 CRUD 화면 구현. 단위 테스트 30/30 green.
## 2026-06-09 | 1단계 완료 | chore(stage-1): E2E 검증 완료 — Firebase Auth REST + Firestore Rules 실 프로젝트 통과. current.md 2단계 전환.
## 2026-06-09 | 1단계 | feat(stage-1): core/auth, core/couple, auth store, 로그인/회원가입/커플연결 화면, 단위 테스트 13종 green
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
## 2026-06-08 | 하네스 | chore(harness): 폴더명 plan→twowo, 문서 아카이브 분리(docs/_archive/), 린트 보안 규칙 3종, GitHub 연결(main 브랜치), .env Firebase 설정 완료
## 2026-06-08 | 0단계 | feat(init): Expo SDK 56 프로젝트 초기화 — 폴더 구조/feature-registry/design-system/tokens/컴포넌트 7종/firestore-hooks/Firebase 초기화/date 유틸 + 단위 테스트 5종 green
