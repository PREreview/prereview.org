import { PlaywrightTestConfig, devices } from '@playwright/test'
import path from 'path'

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
  snapshotDir: path.resolve('integration', 'snapshots'),
  testDir: 'integration',
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
}

export default config
