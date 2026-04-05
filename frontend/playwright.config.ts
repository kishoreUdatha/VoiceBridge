import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for VoiceBridge CRM E2E Tests
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,  // Run sequentially to avoid rate limiting
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,  // Use single worker to avoid overwhelming the server
  timeout: 60000,  // 60 second timeout per test
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,  // 15 seconds for actions
    navigationTimeout: 30000,  // 30 seconds for navigation
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run local dev server before starting tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
