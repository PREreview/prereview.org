import { Duration } from 'effect'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  cacheDir: '.cache/vitest',
  fsModuleCache: true,
  fsModuleCachePath: '.cache/vitest/module',
  test: {
    clearMocks: false,
    include: ['./test/**/*.test.ts'],
    isolate: false,
    sequence: {
      concurrent: true,
    },
    setupFiles: ['test/setup.ts'],
    testTimeout: Duration.toMillis('30 seconds'),
  },
})
