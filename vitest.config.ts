import { Duration } from 'effect'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  cacheDir: '.cache/vitest',
  test: {
    clearMocks: false,
    fsModuleCache: true,
    fsModuleCachePath: '.cache/vitest/module',
    include: ['./test/**/*.test.ts'],
    isolate: false,
    sequence: {
      concurrent: true,
    },
    setupFiles: ['test/setup.ts'],
    testTimeout: Duration.toMillis('30 seconds'),
  },
})
