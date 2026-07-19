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
    'src/apps/users/**/*.ts',
    'src/apps/access-control/**/*.ts',
    'src/apps/audit-logs/**/*.ts',
    'src/apps/stations/**/*.ts',
    'src/apps/devices/**/*.ts',
    'src/apps/device-credentials/**/*.ts',
    'src/apps/device-ingestion/**/*.ts',
    'src/apps/lockers/**/*.ts',
    'src/apps/charging-ports/**/*.ts',
    '!src/apps/**/*.module.ts',
    '!src/apps/**/dto/**/*.ts',
    '!src/apps/**/types/**/*.ts',
    '!src/apps/**/decorators/**/*.ts',
    '!src/apps/**/constants/**/*.ts',
    '!src/apps/**/mappers/**/*.ts',
    '!src/apps/auth/**/*.module.ts',
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
