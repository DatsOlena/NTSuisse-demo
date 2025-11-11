/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^.+\\.(svg|png|jpg|jpeg|gif)$': '<rootDir>/src/test/__mocks__/fileMock.ts',
    '^../shared/(.*)$': '<rootDir>/src/components/Shared/$1',
    '^../Shared/(.*)$': '<rootDir>/src/components/Shared/$1',
    '^../components/(.*)$': '<rootDir>/src/components/$1',
    '^../api/(.*)$': '<rootDir>/src/api/$1',
    '^../hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^../types/(.*)$': '<rootDir>/src/types/$1',
    '^../utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/main.tsx'],
}

