# 현재 작업 컨텍스트 (진행 추적용 — SSOT)

> 이 파일은 **단계 진행 상황의 단일 진실 소스(SSOT)** 입니다.
> 단계별 "계획서"는 `stage-N.md`에 있고 거의 수정되지 않습니다.
> 이 파일은 매 세션마다 자유롭게 갱신됩니다.

## 지금 단계: 2단계 — 캘린더 + 사진
> 상세 계획은 `tasks/stage-2.md` 참고

## 진행 체크 (stage-2.md의 1차 목표를 복사)
- [ ] core/calendar/: calendarEvents CRUD (Firestore)
- [ ] core/calendar/deleteEvent.ts: 이벤트 삭제 시 photos + Storage 정리
- [ ] core/storage/: 라이브러리 사진 업로드 + 압축 + EXIF 제거 + 썸네일 생성
- [ ] core/storage/cleanupOrphans: 고아 Storage 객체 정리
- [ ] core/memory/: 이벤트 + 사진 조합 조회 훅
- [ ] **Jest 단위 테스트**: upload.test.ts, deleteEvent.test.ts
- [ ] 월간 달력 화면 (app/(tabs)/calendar.tsx) — react-native-calendars
- [ ] 이벤트 추가/수정/삭제 화면 (RHF+zod)
- [ ] 사진 선택 + 압축 + EXIF 제거 (expo-image-picker + expo-image-manipulator)
- [ ] 사진 뷰: 그리드 + 원본 전체화면

## 이전 세션에서 멈춘 곳
1단계 완료 + E2E 검증 완료 (Firebase Auth REST + Firestore Rules 실제 프로젝트 통과 확인).
Storage 배포는 Blaze 플랜 업그레이드 후 2단계 시작 전 배포 필요.

## 다음 단계 예고
3b 오늘의 컨디션 (컨디션만 1차)

> **범위 기준: ADR-018** — 1차 MVP 6개(인증·캘린더·컨디션·홈/로컬알림·단순해제·TestFlight 게이트)만 먼저. 투표/빙고/원격푸시/실험실/30일유예/공개출시는 2차.

---
<!-- 새 단계 시작 시 위 내용을 아래 템플릿으로 교체 -->
<!--
## 지금 단계: N단계 — [단계명]
> 상세 계획은 `tasks/stage-N.md` 참고

## 진행 체크
- [ ] (stage-N.md 목표를 복사)

## 이전 세션에서 멈춘 곳
[어디서 멈췄는지, 어떤 파일을 다음에 볼지]

## 다음 단계 예고
[다음에 할 것]
-->
