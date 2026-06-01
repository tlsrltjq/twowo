# 3b단계 작업 컨텍스트 — 오늘의 컨디션

## 지금 단계: 3b단계 — 오늘의 컨디션

## 기능 설명
매일 서로의 컨디션(에너지, 기분, 만남 가능 여부)을 공유.
홈 화면 요약 카드와 푸시 알림에도 연동되는 핵심 데이터 소스.

## 목표
- [ ] features/mood-share/ 폴더 구조 생성
- [ ] 컨디션 입력 화면
  - 에너지 레벨 (1~5 슬라이더 or 이모지 선택)
  - 기분 선택 (great / good / okay / bad)
  - 오늘 만남 가능 여부 (토글)
  - 한 줄 메모 (선택)
- [ ] 당일 1회만 입력 가능, 수정은 당일 중 허용
- [ ] Firestore moodChecks 컬렉션 연동
  - 문서 ID: `{coupleId}_{userId}_{YYYY-MM-DD}` 형식 (중복 방지)
- [ ] 상대방 컨디션 조회 화면 (오늘 입력 안 했으면 "아직 입력 전" 표시)
- [ ] 컨디션 히스토리 (최근 7일 내 기록 간단히 표시)
- [ ] feature-registry/registry.ts에 등록 (status: 'experimental')
- [ ] **Jest 단위 테스트**: `setTodayMood.test.ts`(BR-2 lock, BR-3 백필 거부), `getTodayKST` 다양한 타임존 케이스
- [ ] **통합 테스트**: `__tests__/integration/mood-sync.test.ts`(상대 입력 → 1초 내 반영, 에뮬레이터)

## 완료 기준
- 컨디션 입력 후 Firestore 저장 확인
- 상대방이 입력한 컨디션이 내 화면에 실시간으로 표시됨
- 당일 이미 입력한 경우 입력 화면 대신 수정 화면으로 전환
- 실험실 탭에서 ON/OFF 토글 작동
- **mood.md 의 BR ↔ 테스트 매핑** 모두 매핑됨
- 23:59 KST 경계, 자정 직후 케이스 단위 테스트 green

## 건드리면 안 되는 파일
- core/ 전체 (참조만 허용)
- feature-registry/types.ts


## 다음 단계 예고
3c단계: 데이트 빙고
