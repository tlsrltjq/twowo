# 1단계 작업 컨텍스트 — 인증 + 커플 연결

## 지금 단계: 1단계 — 인증 + 커플 연결

## 목표
- [ ] Firebase Auth 이메일 로그인 화면 구현 (app/(auth)/login.tsx)
- [ ] 구글 로그인 추가 (expo-auth-session)
- [ ] 로그인 후 coupleId 유무 분기 처리
- [ ] 커플 연결 화면 구현 (app/(auth)/couple-connect.tsx)
- [ ] 초대 코드 생성 → `invitations/{code}` 문서 생성 (TTL 24h, ADR-007)
- [ ] 초대 코드 입력 → invitations get → 트랜잭션으로 couples.memberIds 추가 + invitations 삭제
- [ ] core/auth/, core/couple/ 모듈 구현
- [ ] **Jest 단위 테스트**: `core/couple/createInvite.test.ts`, `core/couple/joinByCode.test.ts` — 트랜잭션 성공/실패/만료 케이스 (Firebase 에뮬레이터 또는 mock)
- [ ] **firestore.rules / storage.rules 배포** (`firebase deploy --only firestore:rules,storage`)
- [ ] Firebase 콘솔에서 규칙 활성 상태 확인

## 완료 기준
- 이메일로 회원가입/로그인 가능
- 로그인 후 coupleId 없으면 커플 연결 화면으로 이동
- 초대 코드 생성 → 상대방이 입력 → Firestore couples 문서에 memberIds[2] 채워짐
- 연결 완료 후 메인 탭으로 이동
- **Security Rules 배포 완료**: 비인증/타 커플 토큰으로 데이터 접근 시 PERMISSION_DENIED
- **단위 테스트 통과**: core/couple 의 invite/join 시나리오 green
- **수동 검증**: 시뮬레이터/콘솔에서 (a) 다른 커플의 couples 문서 get 차단, (b) inviteCode 없이 invitations list 차단, (c) 같은 커플 상대방 user get 가능 — 3개 케이스 확인

## 건드리면 안 되는 파일
- feature-registry/types.ts
- .env
- core/couple/ (이 단계에서 새로 만드는 것은 OK, 이후 단계에서 함부로 수정 금지)


## 다음 단계 예고
2단계: 캘린더 화면, 일정 CRUD, 사진 첨부
