# 2단계 작업 컨텍스트 — 캘린더 + 사진

## 지금 단계: 2단계 — 캘린더 + 사진

## 설계 원칙
- 이벤트 타입(date / exercise / general)으로 구분, 데이터는 하나
- 뷰만 전환 (캘린더 뷰 / 사진 뷰 / 운동 뷰 / 데이트 뷰)
- 사진은 인앱 카메라 or 라이브러리 선택 → 압축 후 업로드
- 모든 이벤트는 coupleId 기준으로 실시간 공유

## 목표

### 코어 모듈
- [ ] core/calendar/: calendarEvents CRUD (Firestore)
- [ ] core/calendar/deleteEvent.ts: 이벤트 삭제 시 photos + Storage 객체(원본/썸네일) 일괄 정리 (architecture.md "사진/이벤트 삭제 규칙")
- [ ] core/storage/: 사진 업로드 + 썸네일 생성 + 개별 삭제 (Firebase Storage)
- [ ] core/memory/: 이벤트 + 사진 조합 조회 훅
- [ ] **Jest 단위 테스트**: `core/storage/upload.test.ts` 압축/리사이즈 결과, `core/calendar/deleteEvent.test.ts` 삭제 시 Storage까지 정리되는지 (Firebase 에뮬레이터 또는 mock)

### 캘린더 화면 (app/(tabs)/calendar.tsx)
- [ ] 월간 달력 구현 (react-native-calendars)
- [ ] 날짜에 이벤트 타입별 점 표시 (색상 구분)
- [ ] 날짜 탭 → 해당 날 이벤트 목록 표시
- [ ] 뷰 전환 탭바 구현 (캘린더 / 사진 / 운동 / 데이트)

### 이벤트 추가/수정/삭제
- [ ] 이벤트 타입 선택 (일정 / 운동 / 데이트)
- [ ] 공통 필드 입력: 제목, 날짜, 장소, 메모, 태그
- [ ] 운동 전용 필드: 운동 종류, 시간, 거리
- [ ] 데이트 전용 필드: 분위기, 평점
- [ ] 수정/삭제 기능

### 사진 기능
- [ ] 인앱 카메라 (expo-camera) → 촬영 즉시 업로드
- [ ] 라이브러리 선택 (expo-image-picker) → expo-image-manipulator로 압축
  - 긴 쪽 최대 1440px 리사이즈, quality: 0.75
- [ ] 썸네일 자동 생성 (400px, quality: 0.6)
- [ ] 사진 뷰: 그리드 형식, 탭 시 원본 전체화면
- [ ] 이벤트 카드에 썸네일 최대 3장 미리보기

### 뷰별 화면
- [ ] 사진 뷰: photoIds 있는 이벤트만 그리드로
- [ ] 운동 뷰: type === 'exercise' 리스트 + 이번 달 총 운동 시간 합계
- [ ] 데이트 뷰: type === 'date' 타임라인 (최신순)

## 완료 기준
- 커플 양쪽이 같은 이벤트 목록 실시간 조회 가능
- 이벤트 추가/수정/삭제 후 Firestore 반영 및 화면 갱신
- 사진 업로드 후 썸네일이 리스트에 표시됨 (로딩 1초 이내)
- 뷰 전환 탭 탭 → 해당 뷰로 정상 필터링
- 운동 뷰에서 이번 달 총 운동 시간 표시
- 사진 원본 크기 평균 500KB 이하 유지
- **이벤트 삭제 시 Storage 객체(원본/썸네일)도 함께 삭제됨** — Firebase 콘솔에서 고아 파일 0건 확인
- **단위 테스트 통과**: `core/storage/`, `core/calendar/deleteEvent` 테스트 green

## 건드리면 안 되는 파일
- core/couple/ (coupleId 로직 수정 금지)
- feature-registry/types.ts


## 다음 단계 예고
3단계: 실험 기능 3종 (둘다좋아, 오늘의 컨디션, 데이트 빙고)
