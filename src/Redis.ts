import { Config, Context, Duration, Effect, flow, Inspectable, Layer, pipe, Redacted, Runtime } from 'effect'
import { Redis as IoRedis } from 'ioredis'

const makeRedis = (url: Redacted.Redacted<URL>) =>
  Effect.gen(function* () {
    const runtime = yield* Effect.runtime()
    const redis = new IoRedis(Redacted.value(url).href, {
      commandTimeout: Duration.toMillis('2 seconds'),
      enableAutoPipelining: true,
    })

    const runSync = Runtime.runSync(runtime)

    redis.on('connect', () =>
      runSync(
        pipe(
          Effect.logDebug('Redis connected'),
          Effect.annotateLogs({ host: redis.options.host, port: redis.options.port }),
        ),
      ),
    )
    redis.on('close', () =>
      runSync(
        pipe(
          Effect.logDebug('Redis connection closed'),
          Effect.annotateLogs({ host: redis.options.host, port: redis.options.port }),
        ),
      ),
    )
    redis.on('reconnecting', () =>
      runSync(
        pipe(
          Effect.logInfo('Redis reconnecting'),
          Effect.annotateLogs({ host: redis.options.host, port: redis.options.port }),
        ),
      ),
    )
    redis.removeAllListeners('error')
    redis.on('error', error =>
      runSync(
        pipe(
          Effect.logError('Redis connection error'),
          Effect.annotateLogs({ error: error.message, host: redis.options.host, port: redis.options.port }),
        ),
      ),
    )

    return redis
  })

const teardownRedis = (redis: IoRedis) =>
  pipe(
    Effect.tryPromise({
      try: () => redis.quit(),
      catch: error => (error instanceof Error ? error : new Error(Inspectable.toStringUnknown(error))),
    }),
    Effect.tapBoth({
      onSuccess: () => Effect.logDebug('Redis disconnected'),
      onFailure: error =>
        pipe(Effect.logWarning('Redis unable to disconnect'), Effect.annotateLogs('error', error.message)),
    }),
    Effect.ignore,
  )

export const redisLifecycle = (...args: Parameters<typeof makeRedis>) =>
  Effect.acquireRelease(makeRedis(...args), teardownRedis)

export class DataStoreRedis extends Context.Tag('DataStoreRedis')<DataStoreRedis, IoRedis>() {}

export const layerDataStore = flow(redisLifecycle, Layer.effect(DataStoreRedis))

export const layerDataStoreConfig = (options: Config.Config.Wrap<Parameters<typeof layerDataStore>[0]>) =>
  Layer.unwrapEffect(Effect.andThen(Config.unwrap(options), layerDataStore))

export class HttpCacheRedis extends Context.Tag('HttpCacheRedis')<
  HttpCacheRedis,
  { primary: IoRedis; readonlyFallback: IoRedis }
>() {}

const layerHttpCache = flow(
  redisLifecycle,
  Effect.andThen(redis => ({ primary: redis, readonlyFallback: redis })),
  Layer.effect(HttpCacheRedis),
)

export const layerHttpCacheConfig = (options: Config.Config.Wrap<Parameters<typeof layerHttpCache>[0]>) =>
  Layer.unwrapEffect(Effect.andThen(Config.unwrap(options), layerHttpCache))
