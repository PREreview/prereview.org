import { Duration } from 'effect'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['./test/**/*.test.ts'],
    sequence: {
      concurrent: true,
    },
    setupFiles: ['test/setup.ts'],
    testTimeout: Duration.toMillis('30 seconds'),
  },
})
