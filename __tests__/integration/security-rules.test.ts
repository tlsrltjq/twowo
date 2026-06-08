/**
 * 통합 테스트: Firestore Security Rules 검증
 * 실행: npm run test:integration (FIRESTORE_EMULATOR_HOST=localhost:8080 필요)
 *
 * 완료 기준 (수동 검증):
 *   (a) 비멤버가 couples 문서 get → PERMISSION_DENIED
 *   (b) inviteCode 없이 invitations list → PERMISSION_DENIED
 *   (c) 같은 커플 상대방 user get → 허용
 *
 * NOTE: Security Rules 검증은 실제 인증 토큰이 필요합니다.
 *       @firebase/rules-unit-testing 패키지 설치 후 완성 예정 (stage-1 완료 기준 수동 검증 포함).
 */

if (process.env.FIRESTORE_EMULATOR_HOST) {
  describe('security-rules (integration)', () => {
    it.todo('비멤버가 couples 문서 get → PERMISSION_DENIED');
    it.todo('inviteCode 없이 invitations list → PERMISSION_DENIED');
    it.todo('같은 커플 상대방 user get → 허용');
  });
}

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  test.skip('⏭ integration: FIRESTORE_EMULATOR_HOST 환경변수 없음 — firebase emulators:start --only firestore 후 재실행', () => {});
}

export {};
