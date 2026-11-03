/**
 * Jest Configuration
 *
 * Comprehensive test configuration with:
 * - TypeScript support via ts-jest
 * - Coverage thresholds for business logic (80%)
 * - Module path aliases matching tsconfig
 * - Test environment setup
 */

/** @type {import('jest').Config} */
module.exports = {
  // Use Node.js environment for server-side tests
  testEnvironment: 'node',

  // TypeScript transformation
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          moduleResolution: 'bundler',
        },
      },
    ],
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Module path aliases matching tsconfig.json
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/server/(.*)$': '<rootDir>/src/server/$1',
    '^@/styles/(.*)$': '<rootDir>/src/styles/$1',
    '^@/layout/(.*)$': '<rootDir>/layout/$1',
  },

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.test.tsx',
    '**/__tests__/**/*.ts',
    '**/__tests__/**/*.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/dist/',
    '/coverage/',
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    // Exclude UI components (shadcn) from coverage
    '!src/components/ui/**',
    // Exclude generated files
    '!src/generated/**',
    // Exclude entry points
    '!src/app/**/page.tsx',
    '!src/app/**/layout.tsx',
    '!src/app/**/loading.tsx',
    '!src/app/**/error.tsx',
  ],

  // Coverage thresholds for business logic (80%)
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    // Stricter thresholds for business logic
    './src/server/api/services/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/lib/validations/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Coverage reporters
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],

  // Coverage output directory
  coverageDirectory: '<rootDir>/coverage',

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Maximum workers
  maxWorkers: '50%',

  // Fail on console errors/warnings in tests
  errorOnDeprecated: true,

  // Test timeout
  testTimeout: 10000,

  // Globals
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
};
