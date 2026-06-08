# 현재 작업 컨텍스트 (진행 추적용 — SSOT)

> 이 파일은 **단계 진행 상황의 단일 진실 소스(SSOT)** 입니다.
> 단계별 "계획서"는 `stage-N.md`에 있고 거의 수정되지 않습니다.
> 이 파일은 매 세션마다 자유롭게 갱신됩니다.

## 지금 단계: 1단계 — 인증 + 커플 연결
> 상세 계획은 `tasks/stage-1.md` 참고

## 진행 체크 (stage-1.md의 목표를 복사해서 ✅로 마킹)
- ✅ Firebase Auth 이메일 로그인 화면 구현 (app/(auth)/login.tsx)
- ✅ 회원가입 화면 (app/(auth)/signup.tsx)
- [ ] 비밀번호 재설정 흐름 — `sendPasswordReset` 함수 구현됨, UI 미연결
- ✅ 로그인 후 coupleId 유무 분기 처리 (app/index.tsx)
- ✅ 커플 연결 화면 구현 (app/(auth)/couple-connect.tsx)
- ✅ `ensureCouple(uid)` — 발급 전 커플 선생성 + users.coupleId 설정 (BR-0)
- ✅ 초대 코드 생성 → `invitations/{code}` 문서 생성 (TTL 24h, ADR-007). 재발급은 `getDocs` + `writeBatch`(BR-3)
- ✅ 초대 코드 입력 → 트랜잭션으로 couples.memberIds 추가 + invitations 삭제
- ✅ core/auth/, core/couple/ 모듈 구현
- ✅ **Jest 단위 테스트**: generateCode(BR-2), ensureUserDoc(BR-1), joinByCode(BR-4/6/7/8) — 13/13 green
- ✅ 통합 테스트 파일 생성 (에뮬레이터 준비 후 실행 가능)
- [ ] **firestore.rules / storage.rules / 인덱스 배포** — rules 이미 작성됨, firebase deploy 미실행
- [ ] Firebase 콘솔에서 규칙 활성 상태 확인

## 이전 세션에서 멈춘 곳
1단계 코드 작업 완료. TypeScript 에러 0, 단위 테스트 18/18 green.
남은 것: firebase deploy --only firestore:rules,firestore:indexes,storage + 시뮬레이터 실행 확인(Xcode 다운로드 중)

## 다음 단계 예고
2단계: 캘린더 화면, 일정 CRUD, 사진 첨부

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
