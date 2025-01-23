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
