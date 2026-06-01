# 개발 환경 · 빌드 · 배포

> **이 문서는 참고용 디테일**. AI 가 자동 작업 시 매번 읽는 룰북은 `FRONTEND_RULES.md / TEST_STRATEGY.md`.
> 여기는 *왜 그렇게 결정했는지* / *깊은 디테일이 필요할 때* 만 참고.


> 코드 스타일 / TS 설정 / 환경 변수 / EAS 프로필 / 앱 메타 / 배포 직전 체크.

## 결정 요약
- **TypeScript**: strict 모드 ON (`tsconfig.json`)
- **린터/포매터**: ESLint (Expo 기본 + import 정렬) + Prettier
- **환경 변수**: `EXPO_PUBLIC_*` 만 클라이언트 노출. 그 외는 빌드 시 주입.
- **EAS 프로필**: development / preview / production 3개
- **앱 이름**: 가칭 "둘다좋아" (사용자가 출시 직전에 확정)
- **번들 ID**: `com.{사용자고유값}.dulda` (사용자가 7단계 직전 확정)
- **배포 직전 항목** (Sentry/접근성/iPad/온보딩 등): 7단계에서 결정. 지금은 메모만.

---

## TypeScript 설정
**핵심**: `tsconfig.json` 에 `strict: true`.

```jsonc
// tsconfig.json (Expo 기본 + 강화)
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": false,        // RN 핸들러 시그니처 호환
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "paths": {
      "@/*": ["./*"],
      "core/*": ["./core/*"],
      "design-system/*": ["./design-system/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

**규칙** (CLAUDE.md 와 일관):
- `any` 금지. 임시로 필요하면 `// TODO: type` 주석 + `unknown` 으로.
- Firestore `data()` 결과는 항상 명시적 타입 단언 (또는 `zod.parse`).

---

## ESLint / Prettier

### `.eslintrc.json`
```jsonc
{
  "extends": [
    "expo",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier"
  ],
  "plugins": ["@typescript-eslint", "import", "simple-import-sort"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "simple-import-sort/imports": "warn",
    "simple-import-sort/exports": "warn",
    "import/no-default-export": "off",     // Expo Router 가 default export 강제
    "import/order": "off",                  // simple-import-sort 사용
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  },
  "ignorePatterns": ["node_modules", "dist", "android", "ios", ".expo"]
}
```

### `.prettierrc`
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### Git hooks (배포 직전 권장)
- `husky` + `lint-staged` 로 커밋 직전 자동 검사
- 메모: stage-7 진입 시 도입. 그 전에는 CLAUDE.md "버전 관리(커밋) 규칙" 의 수동 절차로 충분.

---

## 환경 변수

### 파일 구조
- `.env` — 실제 값 (gitignored, 사람만 수정)
- `.env.example` — 키 구조만 (체크인)
- Expo 는 `EXPO_PUBLIC_*` 만 클라이언트 번들에 포함.

### `.env.example`
```sh
# Firebase (클라이언트 노출 가능 — 보안은 Security Rules 가 책임)
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

# 개발 환경 식별 (dev/preview/production)
EXPO_PUBLIC_APP_ENV=development
```

### dev / prod Firebase 프로젝트 분리 (선택)
- 권장: 별도 Firebase 프로젝트 2개 — `coupleapp-dev`, `coupleapp-prod`.
- `.env.development`, `.env.production` 분리 후 EAS 프로필별 `--profile` 로 주입.
- 둘만 쓰는 앱이라 한 프로젝트만 써도 무방. 다만 데이터 실험 시 prod 오염 위험.
- 결정 시점: 1단계 진입 직전. **권장: 분리**.

### 사용
```ts
// core/config/firebase.ts
import Constants from 'expo-constants';

export const firebaseConfig = {
  apiKey:    process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  // ...
};
export const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';
```

---

## EAS Build 프로필 (`eas.json`)
```jsonc
{
  "cli": { "version": ">= 11.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": false, "buildConfiguration": "Debug" },
      "env": { "EXPO_PUBLIC_APP_ENV": "development" }
    },
    "preview": {
      "distribution": "internal",
      "ios": { "buildConfiguration": "Release" },
      "env": { "EXPO_PUBLIC_APP_ENV": "preview" },
      "channel": "preview"
    },
    "production": {
      "ios": { "buildConfiguration": "Release" },
      "env": { "EXPO_PUBLIC_APP_ENV": "production" },
      "channel": "production",
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "", "ascAppId": "", "appleTeamId": "" }
    }
  }
}
```

**언제 어느 프로필?**
- `development` — `expo start --dev-client` 와 함께. USB 또는 시뮬레이터로 빠른 반복.
- `preview` — TestFlight 내부 테스터용 (7단계 권장).
- `production` — App Store 정식 출시 (둘만 쓰면 안 가도 됨).

---

## 앱 메타 정보 (`app.json` 일부)
```jsonc
{
  "expo": {
    "name": "둘다좋아",                          // 사용자가 확정
    "slug": "dulda",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",                 // 7단계에서 디자인
    "scheme": "dulda",                           // 딥링킹 (배포 직전)
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#FFFBF7"               // design-system 의 bg.base
    },
    "ios": {
      "bundleIdentifier": "com.shingiseop.dulda",
      "supportsTablet": false,                   // iPad 미지원 (1차)
      "buildNumber": "1"
    },
    "android": { "package": "com.shingiseop.dulda" },
    "plugins": [
      "expo-router",
      "expo-font",
      "expo-image-picker",
      "expo-camera",
      "expo-notifications"
    ],
    "experiments": { "typedRoutes": true }
  }
}
```

**확정 시점**:
- 앱 이름: 7단계 직전 (가칭 "둘다좋아" 그대로 가도 OK)
- 번들 ID: 7단계 직전 (Apple Developer 가입 후 결정)
- 아이콘/스플래시: 7단계에서 디자인

---

## 폰트 로딩 (0단계 처리)
```ts
// app/_layout.tsx
import { useFonts } from 'expo-font';

const [loaded] = useFonts({
  'Pretendard-Regular':  require('../assets/fonts/Pretendard-Regular.otf'),
  'Pretendard-Medium':   require('../assets/fonts/Pretendard-Medium.otf'),
  'Pretendard-SemiBold': require('../assets/fonts/Pretendard-SemiBold.otf'),
  'Pretendard-Bold':     require('../assets/fonts/Pretendard-Bold.otf'),
});
if (!loaded) return <SplashScreen />;
```
- 폰트 파일은 Pretendard 공식 GitHub (OFL 라이선스) 에서 받아 `assets/fonts/` 에.
- 4가지 굵기 (Regular/Medium/SemiBold/Bold) 로 충분.

---

## 자산 관리 (`assets/`)
```
assets/
├── fonts/                       # Pretendard 4종
├── images/
│   ├── icon.png                 # 1024x1024 (배포 직전)
│   ├── splash.png               # 1242x2436 (배포 직전)
│   └── empty-states/            # 빈 상태 일러스트 (배포 직전)
└── lottie/
    └── confetti.json            # 매칭 성공 축하 (배포 직전 추가)
```

---

## 배포 직전 결정 (지금은 메모)

### 접근성 (a11y)
- 모든 Pressable 에 `accessibilityLabel`
- 텍스트 대비 4.5:1 (디자인 토큰 검증 완료)
- 동적 폰트 크기 지원 여부: 7단계 결정

### 반응형 / iPad
- 1차: iPhone 세로만. `supportsTablet: false`.
- 가로 모드 차단 (`orientation: 'portrait'`).
- iPad 지원은 출시 후 결정.

### 에러 모니터링 (Sentry)
- 7단계 진입 시 도입 검토.
- 둘만 쓰는 앱이라 익명 사용량 분석은 불필요.

### 온보딩 화면
- 1차: 별도 튜토리얼 없음. 권한 안내 화면(rationale, `frontend.md` 참조) 으로 충분.
- 사용자 피드백 보고 결정.

### 오프라인 / 동기화 배너
- `@react-native-community/netinfo` 도입.
- 상단 슬림 배너 (`frontend.md` 참조).
- 7단계에서 실기기 테스트.

### Git hooks (husky + lint-staged)
- 7단계에서 도입.
- 커밋 전 자동 검사: `tsc --noEmit`, `eslint --fix`, `prettier --write`.

### 일러스트
- 빈 상태/축하 일러스트 자산.
- 7단계에서 unDraw, Storyset 같은 무료 소스에서 일괄 수급.

### 딥링킹
- 출시 후 검토. 초대 코드를 URL로 공유 (`dulda://invite/{code}`) 흐름이 있으면 좋음.
- 출시 1차에서는 코드 입력 방식 그대로.

---

## 0단계 ↔ 7단계 책임 분리
- **0단계가 마무리해야 할 것**: `tsconfig.json` strict, `.eslintrc/.prettierrc`, `.env.example`, `eas.json` 3프로필, `app.json` 의 기본 메타 (이름/번들/스플래시 색만), 폰트 로딩.
- **7단계가 마무리할 것**: 아이콘/스플래시 이미지, husky, Sentry, 일러스트, 접근성 점검, TestFlight 제출.
