# 5단계 작업 컨텍스트 — 실험실 탭

## 지금 단계: 5단계 — 실험실 탭

## 목표
- [ ] 실험실 탭 화면 구현 (app/(tabs)/lab.tsx)
- [ ] feature-registry에서 status: 'experimental' 기능 목록 조회
- [ ] 기능별 ON/OFF 토글 UI
- [ ] 토글 상태 → Firestore featureSettings 저장 (coupleId 기준)
- [ ] 커플 양쪽이 같은 토글 상태 공유 (실시간 동기화)
- [ ] 기능 켜면 해당 기능 화면으로 바로 이동하는 링크
- [ ] **Jest 단위 테스트**: `setFeatureEnabled.test.ts`(문서 없으면 OFF 기본값), `getRegistry.test.ts`(experimental 필터)
- [ ] **통합 테스트**: `__tests__/integration/feature-toggle-sync.test.ts`(양쪽 동기화)

## 완료 기준
- 실험실 탭에서 등록된 실험 기능 목록 표시
- 토글 ON → Firestore featureSettings 저장 → 상대방 앱도 실시간 반영
- 토글 OFF → 기능 화면 접근 불가 (숨김 처리)
- 3단계에서 만든 기능 3종이 실험실에서 정상 토글 작동
- **lab-settings.md 의 BR-L* 매핑** 모두 매핑됨

## 건드리면 안 되는 파일
- feature-registry/types.ts (구조 변경 시 반드시 확인 요청)
- core/couple/


## 다음 단계 예고
6단계: 설정 화면 (커플 정보, 기능 관리, 로그아웃)
