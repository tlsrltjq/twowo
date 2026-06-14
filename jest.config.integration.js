/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/integration/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'commonjs' } }],
    '^.+\\.mjs$': ['babel-jest', { presets: ['babel-preset-expo'] }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@firebase/.*|firebase))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^core/(.*)$': '<rootDir>/core/$1',
    '^design-system/(.*)$': '<rootDir>/design-system/$1',
  },
  testTimeout: 30000,
  // 공유 Firestore 에뮬레이터에 대한 clearFirestore 경합 방지: 테스트 파일 직렬 실행
  maxWorkers: 1,
};
