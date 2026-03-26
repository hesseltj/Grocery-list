/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  globalSetup: './__tests__/setup.ts',
  globalTeardown: './__tests__/teardown.ts',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/db/migrate.ts',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: { branches: 70, functions: 75, lines: 75, statements: 75 },
  },
};
