import { defineConfig, devices } from '@playwright/test';

const e2ePort = process.env.E2E_PORT || '18082';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  webServer: {
    command: `PORT=${e2ePort} pnpm exec max dev`,
    // The HTML shell is available before Umi finishes its first compilation.
    // Waiting for the bundle prevents cold-start tests from opening a blank page.
    url: `http://127.0.0.1:${e2ePort}/umi.js`,
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
