import { defineConfig, devices } from '@playwright/test'

/**
 * Smoke tests run against the Vite dev server, which proxies /api and /ws to the
 * starter API on :8000. Start that first: `cd 03-backend-starter && uvicorn app.main:app --port 8000`
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.CI
    ? { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true }
    : undefined,
})
