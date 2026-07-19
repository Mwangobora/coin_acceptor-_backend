import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*(\\.spec|\\.e2e-spec)\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/apps/auth/**/*.ts',
    'src/apps/audit-logs/audit-logs.service.ts',
    '!src/apps/auth/**/*.module.ts',
    '!src/apps/auth/constants/**/*.ts',
    '!src/apps/auth/decorators/**/*.ts',
    '!src/apps/auth/dto/**/*.ts',
    '!src/apps/auth/types/**/*.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testEnvironment: 'node',
};

export default config;
