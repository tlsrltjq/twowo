# 8단계 작업 컨텍스트 — 공개 출시 (App Store Review)

## 지금 단계: 8단계 — App Store 공개 출시
> 전제: 7단계(TestFlight 내부 검증) 완료. 이 단계는 "둘만 쓰기 → 일반 공개"로 넘어가는 관문.
> 공개 시 신뢰 경계는 여전히 "커플(2인)" 이지만, 라이브 데이터가 많아지므로 일부 ADR 재검토 필요.

## ⚠️ 심사 리젝 단골 (먼저 해결 — 없으면 100% 반려)
- [ ] **인앱 계정 삭제** (Guideline 5.1.1(v)) — 계정 생성이 있는 앱은 *인앱에서 계정+데이터 삭제* 경로 필수.
  - 설계: "커플 해제"(status=disconnected, 30일 유예)와 **별개**. 개인 계정 삭제는 즉시 처리.
  - 구현: 클라이언트 직접 delete 금지 유지(`firestore.rules` 그대로) → **callable Cloud Function** 이 본인 데이터 purge + Firebase Auth 사용자 삭제. (rules 의 `allow delete: if false` 는 변경하지 않음 — 사람 확인 영역)
  - 커플 데이터 처리: 한쪽이 계정 삭제 시 상대에게 "상대가 떠났어요" 안내 + 남은 데이터 정책 결정(ADR-017).
- [ ] **Sign in with Apple** (Guideline 4.8) — Google 로그인을 제공하므로 Apple 로그인도 **반드시 함께** 제공.
  - `expo-apple-authentication` 추가. `core/auth/signInWithApple()`. auth-couple 스펙 BR 추가 + 매핑.
- [ ] **개인정보 처리방침 URL** — 공개 호스팅(예: GitHub Pages/Notion). App Store Connect + 앱 내 설정에서 링크.
- [ ] **데모 계정** — 로그인 게이트 앱이라 심사관용 데모 계정/커플 코드를 심사 노트에 제공.

## App Store Connect 메타데이터
- [ ] 앱 이름 / 부제 / 카테고리(소셜 네트워킹 or 라이프스타일)
- [ ] App Privacy "영양정보 라벨" — 수집 데이터 신고: 이메일(계정), 사진(콘텐츠), 사용 데이터. 제3자 추적 없음.
- [ ] 연령 등급 설문 (4+/9+ 예상)
- [ ] 스크린샷 (6.7"/6.5"/5.5" 필수 사이즈), 프로모 텍스트, 설명, 키워드
- [ ] 지원 URL / 마케팅 URL
- [ ] 수출 규정 (암호화: HTTPS 표준만 사용 → 면제 신고)

## 공개 전 보안/정책 재검토 (ADR 연계)
- [ ] **invite 코드 6→8자리 격상 검토** (ADR-016-1 완화책) — 라이브 코드 증가로 브루트포스 표면 확대. 격상 시 `architecture.md`/`auth-couple.md`/`firestore.rules`(길이 체크) 동시 수정 — 사람 확인.
- [ ] ATT(App Tracking Transparency) — 광고/추적 없음이면 불필요. 분석 SDK 추가 시 재검토.
- [ ] honest-client 가정(vote BR-4, moodChecks ADR-016-2)은 신뢰 경계가 "커플 내부"라 공개 후에도 유효. 변동 없음 확인.

## 빌드 / 제출
- [ ] `app.json`: production `version`/`buildNumber`, bundleId 확정 (사람 확인 — eas.json/app.json)
- [ ] `eas build --platform ios --profile production`
- [ ] `eas submit -p ios` → App Store Connect 업로드
- [ ] 심사 제출 → 반려 시 사유별 대응 → 재제출

## 완료 기준
- [ ] 위 "심사 리젝 단골" 4개 모두 구현 + 테스트
- [ ] App Privacy 라벨 / 개인정보 처리방침 일치
- [ ] 심사 승인 + App Store 공개
- [ ] 모든 스펙 BR↔테스트 매핑 표 빠진 BR 없음 (계정 삭제/Apple 로그인 신규 BR 포함)
- [ ] CI green 상태에서만 production 빌드

## 건드리면 안 되는 파일 (사람 확인)
- `.env`, `eas.json`, `app.json`(빌드 식별자)
- `firestore.rules` / `storage.rules` 의 `allow ... if false` — 계정 삭제는 rules 변경 없이 Cloud Function 경유

## 다음 단계 예고
출시 후 — 사용자 피드백 기반 실험 기능 추가 루프 (Feature Sandbox), 그룹 기능(ADR-006) 실험 검토
