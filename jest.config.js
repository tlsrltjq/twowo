/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@firebase/.*|firebase|lucide-react-native|react-hook-form))',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/', '/.expo/', '/__tests__/integration/'],
  collectCoverageFrom: [
    'core/**/*.{ts,tsx}',
    'features/**/*.{ts,tsx}',
    '!**/*.test.{ts,tsx}',
    '!**/__tests__/**',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^core/(.*)$': '<rootDir>/core/$1',
    '^design-system/(.*)$': '<rootDir>/design-system/$1',
  },
  // 통합 테스트는 별도 스크립트로 실행 (FIRESTORE_EMULATOR_HOST 환경에서)
};
