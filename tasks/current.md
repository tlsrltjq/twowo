# 현재 작업 컨텍스트 (진행 추적용 — SSOT)

> 이 파일은 **단계 진행 상황의 단일 진실 소스(SSOT)** 입니다.
> 단계별 "계획서"는 `stage-N.md`에 있고 거의 수정되지 않습니다.
> 이 파일은 매 세션마다 자유롭게 갱신됩니다.

## 지금 단계: 6단계 — TestFlight 게이트 (EAS Build)
> 상세 계획은 `tasks/stage-6.md` 참고 (ADR-018 1차 MVP 마지막 단계)

## 5단계 완료 기록
- ✅ app/(tabs)/settings.tsx — 커플 정보/닉네임/기념일/로그아웃/커플 해제 UI
- ✅ core/couple/disconnect.ts — disconnectCouple / reconnectCouple (BR-D1/D4)
- ✅ app/_layout.tsx — couples.status 구독 → disconnected 감지 시 setCoupleId(null) (BR-D2)
- ✅ core/notifications/ — 권한+Push Token+로컬 알림 스케줄 (BR-4/5/6)
- ✅ 단위 테스트 3종 green (disconnect.test.ts BR-D1/D4)
- ✅ tsc --noEmit 0 errors

## 진행 체크 (stage-6.md 목표)
- [ ] EAS Build 설정 (eas.json 확인 / EAS CLI 로그인)
- [ ] iOS TestFlight 빌드 제출
- [ ] TestFlight 내부 테스터 초대 + 설치 확인

## 이전 세션에서 멈춘 곳
5단계 완료. 6단계(TestFlight 게이트) 시작 전.

## 다음 단계 예고
6단계: EAS Build → TestFlight 제출 (ADR-018 1차 MVP 완료)

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
