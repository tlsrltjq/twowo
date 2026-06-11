# 7단계 작업 컨텍스트 — 마무리 + 배포

## 지금 단계: 7단계 — 마무리 + 배포

## 배포 전략 — 단계별 접근

### Phase A: Expo Go로 기능 검증 (무료, Apple 계정 불필요)
개발 중 0~6단계는 Expo Go 앱으로 테스트 가능.
- QR 코드 스캔으로 즉시 실행
- 두 폰 모두 같은 Wi-Fi에 있으면 실시간 반영
- 한계: 인앱 카메라(expo-camera) 일부 기능, 원격 푸시 알림은 실기기+빌드 필요

### Phase B: Development Build (Apple 계정 필요, 무료 플랜으로 가능)
Expo Go 없이 독립 앱으로 설치. 무료 Apple ID로 가능하지만 **7일마다 재서명 필요**.
- `eas build --profile development --platform ios`
- USB로 기기에 직접 설치 (Xcode 필요)
- 원격 푸시 알림 실기기 테스트 가능

### Phase C: TestFlight 배포 (Apple Developer Program $99/년 필요)
정식 배포에 가까운 방식. 링크 하나로 설치, 90일 유효.
- `eas build --profile preview --platform ios`
- TestFlight 내부 테스터 2명 등록
- 재서명 불필요, 가장 편함

> **권장 시점**: Phase A로 개발 → 6단계 완료 후 Apple Developer 가입 → Phase C로 배포

## 사전 준비 체크리스트 (7단계 시작 전 확인)
- [ ] Apple Developer Program 가입 완료 ($99/년, https://developer.apple.com)
- [ ] App Store Connect에서 앱 등록 (Bundle ID: com.yourname.coupleapp)
- [ ] APNs (Apple Push Notification service) 키 발급 → Firebase 콘솔에 등록
  - Firebase Console → 프로젝트 설정 → 클라우드 메시징 → APNs 인증 키 업로드
- [ ] Firebase 플랜이 Blaze(종량제)인지 확인 (Storage 규칙 배포 + 2차 Cloud Function 준비용)
- [ ] EAS CLI 로그인 확인 (`eas whoami`)

## 목표

### UI 다듬기
- [x] design-system 색상/타이포 전체 화면 통일 점검
- [x] 로딩 상태 처리 (스켈레톤 or 스피너) 전체 화면 확인 — 전 화면 ActivityIndicator/Skeleton 적용
- [x] 에러 상태 처리 (네트워크 오류, Firestore 실패 시 사용자 메시지) — 전 화면 onSnapshot 에러 콜백 + Alert 처리
- [x] 빈 상태(empty state) UI — 전 화면 (일정 없음/컨디션 미입력/빙고 항목 없음 등)
- [x] iOS Safe Area + 키보드 밀림 처리 — 전 화면 SafeAreaView + KAV (Modal 내부 TextInput은 keyboardShouldPersistTaps로 대체)

### 자산 (Assets)
- [x] `assets/icon.png` (1024x1024) → app.json 연결 (경로: `assets/icon.png`)
- [x] `assets/splash-icon.png` → backgroundColor #FFFBF7 (app.json expo-splash-screen 플러그인)
- [ ] 빈 상태 일러스트 이미지 → `assets/images/empty-states/` (디렉토리는 존재, 이미지 파일 없음 — unDraw/Storyset 무료)
- [x] `assets/lottie/confetti.json` — 매칭 성공 화면
- [x] design-system 토큰만 사용 / accessibilityLabel 아이콘 버튼 5곳 이상 부여

### 빌드/배포 보조
- [x] husky + lint-staged 도입 — package.json + .husky/pre-commit 설정 완료
- [ ] Sentry 도입 검토 (선택 사항 — 실 사용 후 필요 시 추가)
- [ ] `@react-native-community/netinfo` 오프라인 배너 — 패키지 설치됨, UI 미구현

### EAS Build + TestFlight
- [x] app.json: `name "둘다좋아"`, `version "1.0.0"`, `ios.buildNumber "1"`, `ios.bundleIdentifier "com.shingiseop.twowo"`
- [x] deeplink scheme 활성화 — `twowo://` (app.json `scheme: "twowo"`)
- [x] eas.json preview 프로필 설정 — development/preview/production 3개 프로필
- [ ] `eas build --platform ios --profile preview` 실행 (Apple Developer Program 필요)
- [ ] TestFlight에 빌드 제출 → 내부 테스터 2명 초대
- [ ] 두 기기에서 앱 설치 확인

### 실기기 전체 플로우 테스트
> **`docs/_archive/qa-checklist.md` 의 모든 항목을 두 기기에서 한 번씩 통과**시킨다.
> 아래는 그 중 *반드시 확인* 해야 하는 핵심 시나리오 요약.
- [ ] 온보딩 → 로그인 → 커플 연결 코드 생성/입력
- [ ] 캘린더: 일정 추가/수정/삭제, 사진 업로드, 뷰 전환
- [ ] 실험실: 기능 ON/OFF → 상대방 앱에 실시간 반영 확인
- [ ] 푸시 알림: 컨디션 입력 시 상대방 기기에 알림 수신 확인
- [ ] 커플 해제 → 재연결 대기 화면 → 재연결 → 데이터 복원 확인

## 완료 기준
- 두 기기 TestFlight 앱 설치 완료
- 전체 플로우 크래시 없이 10분 이상 사용
- 푸시 알림 실기기 수신 확인
- 사진 업로드 후 썸네일 1초 이내 로딩
- **`docs/_archive/qa-checklist.md` 전 항목 통과** (체크박스 100%)
- CI 가 green 인 상태에서만 production 빌드 (`.github/workflows/ci.yml` 결과 확인)
- 모든 스펙의 BR ↔ 테스트 매핑 표가 빠진 BR 없이 채워져 있음

## 건드리면 안 되는 파일
- .env
- eas.json (변경 시 재빌드 필요 — 반드시 확인 후 수정)


## 다음 단계 예고
배포 완료 후 — 실제 사용하며 새 실험 기능 추가 반복 (Feature Sandbox 루프)
