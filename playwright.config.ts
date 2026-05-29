import { defineConfig, devices } from '@playwright/test'

const adminPort = Number(process.env.ADMIN_PORT ?? 3002)
const adminBaseUrl = process.env.ADMIN_BASE_URL ?? `http://127.0.0.1:${adminPort}`

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: adminBaseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : {
        command: `NEXT_PUBLIC_API_URL=http://127.0.0.1:3001/v1 pnpm --dir admin exec next dev --hostname 127.0.0.1 --port ${adminPort}`,
        url: adminBaseUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
      },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
})
