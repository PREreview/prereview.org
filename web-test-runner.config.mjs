import rollupUrl from '@rollup/plugin-url'
import { esbuildPlugin } from '@web/dev-server-esbuild'
import { fromRollup } from '@web/dev-server-rollup'
import { playwrightLauncher } from '@web/test-runner-playwright'

const url = fromRollup(rollupUrl)

export default {
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
    playwrightLauncher({ product: 'webkit' }),
    playwrightLauncher({ product: 'firefox' }),
  ],
  files: 'test/assets/**/*.test.ts',
  nodeResolve: true,
  plugins: [url({}), esbuildPlugin({ ts: true })],
}
