import cacache from 'cacache'
import { Config, Effect, Inspectable, pipe } from 'effect'

export const verifyCache = Effect.gen(function* () {
  const verifyCache = yield* Config.withDefault(Config.boolean('VERIFY_CACHE'), true)
  const disableLegacyVolumeBasedCache = yield* Config.withDefault(
    Config.boolean('DISABLE_LEGACY_VOLUME_BASED_CACHE'),
    false,
  )

  if (!verifyCache || disableLegacyVolumeBasedCache) {
    return yield* Effect.void
  }

  const delay = yield* Config.withDefault(Config.duration('VERIFY_CACHE_DELAY'), '0 seconds')

  yield* pipe(
    Effect.logDebug('Verifying cache'),
    Effect.andThen(Effect.tryPromise(() => cacache.verify('data/cache', { concurrency: 5 }))),
    Effect.tapBoth({
      onSuccess: stats => pipe(Effect.logDebug('Cache verified'), Effect.annotateLogs('stats', stats)),
      onFailure: ({ error }) =>
        pipe(
          Effect.logWarning('Failed to verify cache'),
          Effect.annotateLogs('error', error instanceof Error ? error.message : Inspectable.toStringUnknown(error)),
        ),
    }),
    Effect.ignore,
    Effect.delay(delay),
  )
})
