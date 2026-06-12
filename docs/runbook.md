# 운영 런북

> 배포·롤백·모니터링 절차의 단일 진실 소스.
> 코드 변경 없이 콘솔/CLI만으로 하는 운영 작업을 기록한다.

## 1. 배포 순서 (반드시 이 순서)

```
1. Firebase 인덱스  →  2. Firestore/Storage Rules  →  3. 앱 빌드 배포
```

인덱스가 Rules보다 먼저여야 한다. Rules 배포와 앱 배포를 동시에 하면 인덱스 빌드 지연으로 쿼리가 실패할 수 있다 (ADR-023).

### 1-1. 인덱스 배포
```bash
firebase deploy --only firestore:indexes
# 콘솔에서 인덱스 상태 "빌드 중 → 사용 설정됨" 확인 후 다음 단계 진행
```

### 1-2. Rules 배포
```bash
# 배포 전 에뮬레이터 테스트 통과 필수
npm run test:integration:local

# 통과 확인 후 배포
firebase deploy --only firestore:rules,storage:rules
```

### 1-3. 앱 빌드 (EAS)
```bash
# TestFlight 내부 검증
eas build --platform ios --profile preview

# App Store 제출 (8단계)
eas build --platform ios --profile production
eas submit -p ios
```

> CI가 green인 상태에서만 production 빌드. `.github/workflows/ci.yml` 결과 확인 필수.

---

## 2. 롤백 절차

### Rules 롤백
Firebase Console → Firestore → 규칙 탭 → "게시 기록"에서 이전 버전 선택 → "이 버전으로 규칙 게시".

또는 git으로 이전 버전 복원 후 재배포:
```bash
git show HEAD~1:firestore.rules > firestore.rules
firebase deploy --only firestore:rules
```

### 인덱스 롤백
인덱스 추가는 롤백 불필요 (기존 쿼리에 영향 없음). 인덱스 삭제가 필요하면 `firestore.indexes.json`에서 제거 후 재배포.

### 앱 롤백
TestFlight: App Store Connect → TestFlight → 이전 빌드로 "테스터에게 배포" 전환.
App Store: App Store Connect → "이전 버전으로 복원" (심사 통과된 버전만 가능).

---

## 3. 모니터링 포인트

### Firestore read 급증 감지
- 콘솔: Firebase Console → 사용량 → Firestore → 일별 읽기 그래프
- 원인 1순위: onSnapshot 구독 누수 (해제 안 된 리스너 루프)
- 원인 2순위: 사진탭 range 쿼리 (2년치 전체 — P2 서버 필터 작업 전까지 주의)
- 예산 알림이 울리면 즉시 앱 로그(Sentry) → "subscribeMessages/subscribeEvents" 호출 횟수 확인

### Sentry 에러 모니터링
- `app/_layout.tsx`에 Sentry 초기화됨. `enabled: APP_ENV !== 'development'`
- preview/production 빌드에서만 캡처
- 주요 주시 에러: `[auth] ensureUserDoc/getCoupleId failed` → Firestore 규칙/네트워크 문제
- 소스맵 업로드 확인: Sentry 대시보드 → Issues → 스택트레이스에 파일명·라인 표시 여부

### Security Rules 실패 급증
- Firebase Console → Firestore → 모니터링 → 오류율 (permission-denied 비율)
- 갑작스런 급증 = 규칙 배포 후 버그 가능성 → 즉시 롤백

---

## 4. Firestore PITR (시점 복구) 설정

> **운영 시작 전 1순위**. 버그 있는 삭제 로직 or 잘못된 배포 시 복구 수단.

**설정 방법** (Google Cloud Console):
1. Google Cloud Console → Firestore → 데이터베이스 선택
2. "PITR" 탭 → "사용 설정" 클릭
3. 보존 기간: 7일 (기본값)

**복구 방법**:
```bash
# 특정 시점으로 전체 내보내기
gcloud firestore export gs://your-bucket/backup-name \
  --snapshot-time="2026-06-10T12:00:00Z"

# 특정 컬렉션만
gcloud firestore export gs://your-bucket/backup-name \
  --collection-ids="couples,calendarEvents" \
  --snapshot-time="2026-06-10T12:00:00Z"
```

---

## 5. Firebase 예산/사용량 알림 설정

**Firestore 읽기 예산 알림**:
1. Google Cloud Console → 결제 → 예산 및 알림 → 예산 만들기
2. 범위: Firebase 프로젝트 선택
3. 금액: 월 $10 (무료 할당량 초과 시 조기 경보)
4. 알림 기준: 50% / 90% / 100%

**Firestore 일일 사용량 알림** (읽기 급증 감지):
1. Google Cloud Console → 모니터링 → 알림 정책 만들기
2. 측정항목: `firestore.googleapis.com/document/read_count`
3. 조건: 일별 합계 > 50,000 (Spark 플랜 무료 한도의 10%)
4. 알림 채널: 이메일

---

## 6. Sentry 소스맵 업로드 설정

> `app.json`에 `@sentry/react-native/expo` 플러그인 등록 완료.
> EAS Build 시 자동 업로드되려면 아래 설정 필요.

**1단계: Sentry 프로젝트 정보 확인**
- Sentry Dashboard → Settings → Projects → 프로젝트 선택
- "Organization Slug"와 "Project Slug" 복사

**2단계: `app.json` 플러그인 업데이트** (`사람 확인` 항목 — 슬러그 직접 입력):
```json
["@sentry/react-native/expo", {
  "organization": "your-org-slug",
  "project": "your-project-slug"
}]
```

**3단계: SENTRY_AUTH_TOKEN EAS Secret 설정**:
```bash
# Sentry → Settings → Auth Tokens → Create New Token (project:releases, org:read 권한)
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value "your-token"
```

**4단계: 소스맵 동작 확인**:
- EAS 빌드 후 앱에서 강제 에러 발생 → Sentry Issues에서 소스 파일명·라인 표시되면 성공

---

## 7. 정기 점검 체크리스트 (월 1회)

- [ ] Firebase 사용량 대시보드 확인 (read/write/storage 추이)
- [ ] Sentry 에러율 확인 (미해결 이슈 없는지)
- [ ] Firestore Security Rules 마지막 배포 날짜 확인
- [ ] invitations 컬렉션 문서 수 확인 (TTL 정상 동작 여부)
- [ ] `firestore.indexes.json`과 실제 콘솔 인덱스 일치 여부
