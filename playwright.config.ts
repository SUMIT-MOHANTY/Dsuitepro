/**
 * Playwright Configuration
 *
 * End-to-end test configuration with:
 * - Multiple viewport sizes (desktop, tablet, mobile)
 * - Auth storage state for authenticated tests
 * - Trace and screenshot on failure
 * - Parallel execution settings
 */

import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// Storage state path for authenticated tests
export const authStorageState = path.join(__dirname, 'tests/e2e/.auth/user.json');

/**
 * Playwright configuration
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI for stability
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/playwright-report.json' }],
  ],

  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'on-first-retry',

    // Action timeout
    actionTimeout: 15000,

    // Navigation timeout
    navigationTimeout: 15000,

    // Viewport size (default to desktop)
    viewport: { width: 1280, height: 720 },
  },

  // Configure projects for major browsers
  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'teardown',
    },
    {
      name: 'teardown',
      testMatch: /.*\.teardown\.ts/,
    },

    // Desktop Chrome
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authStorageState,
      },
      dependencies: ['setup'],
    },

    // Desktop Firefox
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: authStorageState,
      },
      dependencies: ['setup'],
    },

    // Desktop Safari (WebKit)
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: authStorageState,
      },
      dependencies: ['setup'],
    },

    // Tablet (iPad)
    {
      name: 'tablet',
      use: {
        ...devices['iPad (gen 7) landscape'],
        storageState: authStorageState,
      },
      dependencies: ['setup'],
    },

    // Mobile (iPhone)
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 14'],
        storageState: authStorageState,
      },
      dependencies: ['setup'],
    },

    // Auth tests (no storage state - tests login/logout flows)
    {
      name: 'auth',
      testMatch: /auth\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  // Run local dev server before starting the tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  // Global setup and teardown
  globalSetup: require.resolve('./tests/e2e/global-setup'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown'),

  // Output directory for test artifacts
  outputDir: 'test-results/',

  // Expect timeout for assertions
  expect: {
    timeout: 5000,
  },
});
