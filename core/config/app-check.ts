import { FirebaseApp } from 'firebase/app';
import { CustomProvider, initializeAppCheck } from 'firebase/app-check';

// React Native + Firebase JS SDK 조합에서 App Check 설정.
// DEV: Firebase Console에 등록한 debug token으로 검증.
// PROD: 진짜 App Attest는 네이티브 모듈 필요 (ADR-025 참고).
//       App Attest 미구현 상태에서는 initializeAppCheck 호출 자체를 생략.

export function setupAppCheck(app: FirebaseApp): void {
  if (__DEV__) {
    // DEV: CustomProvider로 고정 토큰 반환. Firebase JS SDK는 내부적으로
    // FIREBASE_APPCHECK_DEBUG_TOKEN=true 플래그를 보면 crypto.randomUUID()를 호출하는데,
    // React Native 환경에 crypto 전역이 없어 crash가 발생하므로 플래그를 설정하지 않는다.
    initializeAppCheck(app, {
      provider: new CustomProvider({
        getToken: async () => ({
          token: 'debug',
          expireTimeMillis: Date.now() + 3_600_000,
        }),
      }),
      isTokenAutoRefreshEnabled: true,
    });
    return;
  }

  // 프로덕션: App Attest 네이티브 모듈이 구현될 때까지 App Check 미활성화.
  // Firebase 콘솔에서 "enforcement mode"를 켜지 않으면 Security Rules가 방어선.
  // 활성화 방법은 ADR-025 참고.
}
