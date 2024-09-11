import cacache from 'cacache'
import { Effect, Inspectable, pipe } from 'effect'
import { DeprecatedEnvVars } from './Context.js'

export const verifyCache = Effect.gen(function* () {
  const env = yield* DeprecatedEnvVars

  if (!env.VERIFY_CACHE) {
    return yield* Effect.void
  }

  yield* pipe(
    Effect.logDebug('Verifying cache'),
    Effect.andThen(Effect.tryPromise(() => cacache.verify('data/cache', { concurrency: 5 }))),
    Effect.tap(stats => pipe(Effect.logDebug('Cache verified'), Effect.annotateLogs('stats', stats))),
    Effect.tapError(({ error }) =>
      pipe(
        Effect.logWarning('Failed to verify cache'),
        Effect.annotateLogs('error', error instanceof Error ? error.message : Inspectable.toStringUnknown(error)),
      ),
    ),
    Effect.orElse(() => Effect.void),
  )
})
