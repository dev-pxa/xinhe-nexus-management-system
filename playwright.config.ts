import { defineConfig, devices } from '@playwright/test';

const e2ePort = process.env.E2E_PORT || '18082';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  webServer: {
    command: `PORT=${e2ePort} pnpm exec max dev`,
    url: `http://127.0.0.1:${e2ePort}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: {
    baseURL: process.env.E2E_BASE_URL || `http://127.0.0.1:${e2ePort}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
});
