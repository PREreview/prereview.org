import { PlaywrightTestConfig, devices } from '@playwright/test'
import path from 'path'

const config: PlaywrightTestConfig = {
  expect: {
    toHaveScreenshot: { maxDiffPixels: 30 },
  },
  fullyParallel: true,
  outputDir: 'integration-results',
  preserveOutput: 'failures-only',
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Desktop Chrome (high contrast)',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark' as const,
        contextOptions: { forcedColors: 'active' as const },
      },
    },
    {
      name: 'Mobile Chrome (high contrast)',
      use: {
        ...devices['Pixel 5'],
        colorScheme: 'dark' as const,
        contextOptions: { forcedColors: 'active' as const },
      },
    },
    {
      name: 'Desktop Firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'iPhone 11',
      use: { ...devices['iPhone 11'] },
    },
  ].flatMap(env => [env, { name: `${env.name} (no JavaScript)`, use: { ...env.use, javaScriptEnabled: false } }]),
  snapshotDir: path.resolve('integration', 'snapshots'),
  testDir: 'integration',
  use: {
    javaScriptEnabled: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },
}

export default config
