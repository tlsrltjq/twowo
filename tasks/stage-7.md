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
- [ ] Firebase 플랜이 Blaze(종량제)인지 확인 (6단계 Scheduled Function 때문)
- [ ] EAS CLI 로그인 확인 (`eas whoami`)

## 목표

### UI 다듬기
- [ ] design-system 색상/타이포 전체 화면 통일 점검
- [ ] 로딩 상태 처리 (스켈레톤 or 스피너) 전체 화면 확인
- [ ] 에러 상태 처리 (네트워크 오류, Firestore 실패 시 사용자 메시지)
- [ ] 빈 상태(empty state) UI (일정 없음, 컨디션 미입력, 빙고 항목 없음 등)
- [ ] iOS Safe Area, 키보드 올라올 때 입력창 밀림 처리 전체 확인

### 자산 (Assets)
- [ ] `assets/images/icon.png` (1024x1024) → app.json 연결
- [ ] `assets/images/splash.png` (1242x2436) → backgroundColor #FFFBF7
- [ ] 빈 상태 일러스트 → `assets/images/empty-states/` (unDraw/Storyset 무료)
- [ ] `assets/lottie/confetti.json` — 매칭 성공 화면
- [ ] design-system 토큰만 사용했는지 점검 / accessibilityLabel 부여

### 빌드/배포 보조
- [ ] husky + lint-staged 도입
- [ ] Sentry 도입 검토
- [ ] `@react-native-community/netinfo` 오프라인 배너

### EAS Build + TestFlight
- [ ] app.json 의 최종 `name`, `version` (1.0.0), `ios.buildNumber` (1), `ios.bundleIdentifier` 확정
- [ ] (선택) 딥링킹 scheme 활성화 — `dulda://invite/{code}` 흐름
- [ ] eas.json preview 프로필 설정
- [ ] `eas build --platform ios --profile preview` 실행
- [ ] TestFlight에 빌드 제출 → 내부 테스터 2명 초대
- [ ] 두 기기에서 앱 설치 확인

### 실기기 전체 플로우 테스트
> **`docs/qa-checklist.md` 의 모든 항목을 두 기기에서 한 번씩 통과**시킨다.
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
- **`docs/qa-checklist.md` 전 항목 통과** (체크박스 100%)
- CI 가 green 인 상태에서만 production 빌드 (`.github/workflows/ci.yml` 결과 확인)
- 모든 스펙의 BR ↔ 테스트 매핑 표가 빠진 BR 없이 채워져 있음

## 건드리면 안 되는 파일
- .env
- eas.json (변경 시 재빌드 필요 — 반드시 확인 후 수정)


## 다음 단계 예고
배포 완료 후 — 실제 사용하며 새 실험 기능 추가 반복 (Feature Sandbox 루프)
