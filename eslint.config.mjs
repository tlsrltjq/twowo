import expoConfig from 'eslint-config-expo/flat.js';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

// eslint-plugin-react 가 ESLint v10 context API와 호환 안 됨 → react 플러그인 config 제외.
// react-hooks는 별도 패키지이므로 유지.
const filteredExpoConfig = expoConfig.filter(c => !c.plugins?.['react']);

// @typescript-eslint 플러그인이 선언된 config object를 찾아 프로젝트 규칙 오버라이드
const tsIdx = filteredExpoConfig.findIndex(c => c.plugins?.['@typescript-eslint']);
if (tsIdx !== -1) {
  filteredExpoConfig[tsIdx].rules = {
    ...filteredExpoConfig[tsIdx].rules,
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  };
}

export default [
  ...filteredExpoConfig,

  {
    plugins: { 'simple-import-sort': simpleImportSort, 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'simple-import-sort/imports': 'warn',
      'simple-import-sort/exports': 'warn',
      'import/no-default-export': 'off',
      'import/order': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      'no-restricted-imports': ['error', {
        paths: [
          {
            name: 'firebase/firestore',
            importNames: ['onSnapshot'],
            message: 'onSnapshot 직접 사용 금지. core/firestore-hooks의 useFirestoreDoc/useFirestoreQuery를 사용하세요.',
          },
        ],
      }],

      'no-restricted-properties': ['error', {
        object: 'Constants',
        property: 'expoConfig',
        message: 'Constants.expoConfig 금지. process.env.EXPO_PUBLIC_* 를 직접 사용하세요.',
      }],

      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/]",
          message: '직접 HEX 색상 금지. design-system/tokens.ts 토큰을 사용하세요.',
        },
      ],
    },
  },

  // design-system/ 전체는 HEX 직접 허용 (tokens.ts가 진실 소스)
  {
    files: ['design-system/**'],
    rules: { 'no-restricted-syntax': 'off' },
  },

  // core/**는 onSnapshot 직접 사용 허용 (wrapper 구현체)
  {
    files: ['core/**/*.ts', 'core/**/*.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },

  // features/*/index.ts는 onSnapshot 허용 (구독 함수 구현체)
  {
    files: ['features/*/index.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },

  // features Screen 파일들 — features 끼리 cross-import 금지 + Screen에서 onSnapshot 제한
  {
    files: ['features/**/*.tsx'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: 'firebase/firestore',
            importNames: ['onSnapshot'],
            message: 'onSnapshot 직접 사용 금지. core/firestore-hooks를 사용하세요.',
          },
        ],
        patterns: [
          {
            group: ['@/features/*', 'features/*'],
            message: 'features 끼리 직접 import 금지. core/ 를 통해서만.',
          },
        ],
      }],
    },
  },

  // 테스트/목 파일: any 허용, onSnapshot 제한 해제, require() 허용 (jest.mock 패턴)
  {
    files: ['**/__tests__/**/*.ts', '**/*.test.ts', '**/*.test.tsx', '**/__mocks__/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // scripts/ 는 Node.js 환경
  {
    files: ['scripts/**/*.js'],
    languageOptions: { globals: { __dirname: 'readonly', __filename: 'readonly', require: 'readonly', module: 'writable', process: 'readonly' } },
    rules: { 'no-console': 'off', '@typescript-eslint/no-require-imports': 'off' },
  },

  { ignores: ['node_modules/**', 'dist/**', 'android/**', 'ios/**', '.expo/**'] },
];
