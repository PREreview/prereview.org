import * as dns from 'dns'
import { Effect } from 'effect'
import * as L from 'logger-fp-ts'
import { DeprecatedEnvVars, DeprecatedLoggerEnv } from './Context.js'

export const mitigateZenodoSandboxIpv6Issue = Effect.gen(function* () {
  const env = yield* DeprecatedEnvVars
  const loggerEnv = yield* DeprecatedLoggerEnv
  L.debug('zenodo sandbox dns set')(loggerEnv)()
  if (env.ZENODO_URL.href.includes('sandbox')) {
    dns.setDefaultResultOrder('ipv4first')
  }
})
