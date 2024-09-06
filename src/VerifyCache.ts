import cacache from 'cacache'
import { Effect } from 'effect'
import * as E from 'fp-ts/lib/Either.js'
import type { JsonRecord } from 'fp-ts/lib/Json.js'
import * as L from 'logger-fp-ts'
import { DeprecatedEnvVars, DeprecatedLoggerEnv } from './Context.js'

export const verifyCache = Effect.gen(function* () {
  const env = yield* DeprecatedEnvVars
  const loggerEnv = yield* DeprecatedLoggerEnv

  if (!env.VERIFY_CACHE) {
    return yield* Effect.void
  }
  yield* Effect.promise(() =>
    Promise.resolve()
      .then(() => L.debug('Verifying cache')(loggerEnv)())
      .then(() => cacache.verify('data/cache', { concurrency: 5 }))
      .then((stats: JsonRecord) => L.debugP('Cache verified')(stats)(loggerEnv)())
      .catch((error: unknown) => L.errorP('Failed to verify cache')({ error: E.toError(error).message })(loggerEnv)()),
  )
})
