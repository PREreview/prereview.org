import { defineConfig, devices } from '@playwright/test'
import path from 'path'

export default defineConfig({
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.0005 },
  },
  fullyParallel: true,
  outputDir: 'integration-results',
  preserveOutput: 'failures-only',
  projects: [
    ...[
      {
        name: 'Desktop Chrome',
        use: { ...devices['Desktop Chrome'] },
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
    ...[
      {
        name: 'Desktop Chrome',
        use: { ...devices['Desktop Chrome'], contextOptions: { reducedMotion: 'reduce' as const } },
      },
      {
        name: 'Desktop Chrome (high contrast)',
        use: {
          ...devices['Desktop Chrome'],
          colorScheme: 'dark' as const,
          contextOptions: { forcedColors: 'active' as const, reducedMotion: 'reduce' as const },
        },
      },
      {
        name: 'Mobile Chrome (high contrast)',
        use: {
          ...devices['Pixel 5'],
          colorScheme: 'dark' as const,
          contextOptions: { forcedColors: 'active' as const, reducedMotion: 'reduce' as const },
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
    ]
      .map(env => ({
        ...env,
        name: `${env.name} Visual Regression`,
        testDir: 'visual-regression',
        snapshotDir: path.resolve('visual-regression', 'snapshots'),
      }))
      .flatMap(env => [
        env,
        { ...env, name: `${env.name} (no JavaScript)`, use: { ...env.use, javaScriptEnabled: false } },
      ]),
  ],
  testDir: 'integration',
  use: {
    javaScriptEnabled: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },
})
