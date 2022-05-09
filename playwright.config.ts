import { PlaywrightTestConfig, devices } from '@playwright/test'

const config: PlaywrightTestConfig = {
  fullyParallel: true,
  outputDir: 'integration-results',
  preserveOutput: 'failures-only',
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'iPhone 11',
      use: { ...devices['iPhone 11'] },
    },
  ],
  testDir: 'integration',
  use: {
    baseURL: 'http://localhost:3000/',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm start',
    port: 3000,
  },
}

export default config
