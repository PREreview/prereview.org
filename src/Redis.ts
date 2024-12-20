import { Config, Context, Effect, flow, Inspectable, Layer, pipe, Redacted, Runtime } from 'effect'
import { Redis as IoRedis } from 'ioredis'

const makeRedis = (url: Redacted.Redacted<URL>) =>
  Effect.gen(function* () {
    const runtime = yield* Effect.runtime()
    const redis = new IoRedis(Redacted.value(url).href, { commandTimeout: 2 * 1000, enableAutoPipelining: true })

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
    Effect.ignore,
  )

export const redisLifecycle = (...args: Parameters<typeof makeRedis>) =>
  Effect.acquireRelease(makeRedis(...args), teardownRedis)

export const Redis = Context.GenericTag<IoRedis>('Redis')

export const layer = flow(redisLifecycle, Layer.effect(Redis))

export const layerConfig = (options: Config.Config.Wrap<Parameters<typeof layer>[0]>) =>
  Layer.unwrapEffect(Effect.andThen(Config.unwrap(options), layer))
