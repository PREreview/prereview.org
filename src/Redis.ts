import { Context, Effect, Inspectable, pipe, Runtime } from 'effect'
import { Redis as IoRedis } from 'ioredis'
import { DeprecatedEnvVars } from './Context.js'

const makeRedis = Effect.gen(function* () {
  const runtime = yield* Effect.runtime()
  const env = yield* DeprecatedEnvVars
  const redis = new IoRedis(env.REDIS_URI.href, { commandTimeout: 2 * 1000, enableAutoPipelining: true })

  const runSync = Runtime.runSync(runtime)

  redis.on('connect', () => runSync(Effect.logDebug('Redis connected')))
  redis.on('close', () => runSync(Effect.logDebug('Redis connection closed')))
  redis.on('reconnecting', () => runSync(Effect.logInfo('Redis reconnecting')))
  redis.removeAllListeners('error')
  redis.on('error', error =>
    runSync(pipe(Effect.logError('Redis connection error'), Effect.annotateLogs({ error: error.message }))),
  )

  return redis
})

const teardownRedis = (redis: IoRedis) =>
  pipe(
    Effect.tryPromise({
      try: () => redis.quit(),
      catch: error => (error instanceof Error ? error : new Error(Inspectable.toStringUnknown(error))),
    }),
    Effect.tap(Effect.logDebug('Redis disconnected')),
    Effect.tapError(error =>
      pipe(Effect.logWarning('Redis unable to disconnect'), Effect.annotateLogs('error', error.message)),
    ),
    Effect.orElse(() => Effect.void),
  )

export const redisLifecycle = Effect.acquireRelease(makeRedis, teardownRedis)

export const Redis = Context.GenericTag<IoRedis>('Redis')
