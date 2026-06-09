# 현재 작업 컨텍스트 (진행 추적용 — SSOT)

> 이 파일은 **단계 진행 상황의 단일 진실 소스(SSOT)** 입니다.
> 단계별 "계획서"는 `stage-N.md`에 있고 거의 수정되지 않습니다.
> 이 파일은 매 세션마다 자유롭게 갱신됩니다.

## 지금 단계: 3b단계 — 오늘의 컨디션
> 상세 계획은 `tasks/stage-3b.md` 참고

## 진행 체크 (stage-3b.md 목표)
- ✅ features/mood-share/ 폴더 구조 생성
- ✅ schema.ts: MoodCheck 타입 + zod schema (BR-4/5) + MoodLockedError
- ✅ index.ts: getTodayMood / setTodayMood(BR-2/3) / subscribePartnerMoodToday(BR-6) / getRecent7Days
- ✅ MoodScreen.tsx: 에너지/기분/만남/메모 입력 + 상대방 실시간 카드(BR-6) + 7일 히스토리(BR-7)
- ✅ 단위 테스트: schema.test.ts(BR-4/5 8종) + setTodayMood.test.ts(BR-2/3 6종) — 50/50 green
- ✅ app/(tabs)/mood.tsx + _layout.tsx 컨디션 탭 등록
- ✅ feature-registry: mood-share experimental 등록
- [ ] (통합 테스트) mood-sync.test.ts — 에뮬레이터 환경에서 상대 입력 1초 내 반영 (BR-6)
- [ ] (통합 테스트) security-rules.test.ts — 다른 userId 명의 작성 PERMISSION_DENIED (BR-8)
- [ ] BR↔테스트 매핑 표 채우기 (mood.md)

## 이전 세션에서 멈춘 곳
3b단계 코드 완료. 통합 테스트(에뮬레이터)와 BR↔테스트 매핑 표 작업 남음.

## 다음 단계 예고
4단계 홈 화면 + 로컬 알림 (ADR-018 1차 기준)

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
