# 3c단계 작업 컨텍스트 — 데이트 빙고

## 지금 단계: 3c단계 — 데이트 빙고

## 기능 설명
커플이 함께 채워가는 데이트 버킷리스트형 빙고.
"한강 피크닉", "새벽 드라이브" 같은 항목을 채우고 빙고 달성.

## 목표
- [ ] features/couple-bingo/ 폴더 구조 생성
- [ ] 빙고판 화면 (5x5 그리드)
- [ ] 빙고 항목 설정
  - 기본 제공 항목 풀에서 선택 or 직접 입력
  - 둘 중 한 명이 설정하면 공유됨
- [ ] 항목 체크/해제 기능 (둘 중 누구나 체크 가능)
- [ ] 체크 시 실시간으로 상대방 화면에도 반영
- [ ] 빙고 달성 감지 (가로/세로/대각선)
- [ ] 빙고 달성 시 축하 애니메이션 + 로컬 알림
- [ ] Firestore bingoBoards 컬렉션 연동
  - items[]: 항목 목록
  - checkedItems[]: 체크된 항목 ID 목록
  - checkedBy: { [itemId]: userId } (누가 체크했는지)
- [ ] 빙고판 완성 후 새 빙고판 시작 기능
- [ ] feature-registry/registry.ts에 등록 (status: 'experimental')
- [ ] **Jest 단위 테스트**: `checkLines.test.ts`(12개 라인 인덱스 — pure 함수라 우선순위 높음), `toggleCell.test.ts`(트랜잭션 + 라인 재계산), `startBoard.test.ts`(이전 보드 자동 completed)

## 완료 기준
- 빙고판 설정 후 양쪽 동일한 판 표시
- 한쪽이 항목 체크 → 상대방 화면에 실시간 반영
- 빙고 1줄 달성 시 축하 화면 표시
- 실험실 탭에서 ON/OFF 토글 작동
- **bingo.md 의 BR ↔ 테스트 매핑** 모두 매핑됨, `checkLines` 12개 라인 전수 검증

## 건드리면 안 되는 파일
- core/ 전체 (참조만 허용)
- feature-registry/types.ts


## 다음 단계 예고
4단계: 홈 화면 + 푸시 알림
