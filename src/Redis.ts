import { Config, Context, Deferred, Duration, Effect, flow, Inspectable, Layer, pipe, Redacted } from 'effect'
import { Redis } from 'effect/persistence'
import { Redis as IoRedis } from 'ioredis'

const makeRedis = (url: Redacted.Redacted<URL>) =>
  Effect.gen(function* () {
    const runtime = yield* Effect.context()
    const redis = new IoRedis(Redacted.value(url).href, {
      commandTimeout: Duration.toMillis('2 seconds'),
      enableAutoPipelining: true,
    })

    const runSync = Effect.runSyncWith(runtime)

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
    Effect.tap(() => Effect.logDebug('Redis disconnected')),
    Effect.tapError(error =>
      pipe(Effect.logWarning('Redis unable to disconnect'), Effect.annotateLogs('error', error.message)),
    ),
    Effect.ignore,
  )

export const redisLifecycle = (...args: Parameters<typeof makeRedis>) =>
  Effect.acquireRelease(makeRedis(...args), teardownRedis)

export class DataStoreRedis extends Context.Service<DataStoreRedis, IoRedis>()('DataStoreRedis') {}

export const layerDataStore = flow(redisLifecycle, Layer.effect(DataStoreRedis))

export const layerDataStoreConfig = (options: Config.Wrap<Parameters<typeof layerDataStore>[0]>) =>
  Layer.unwrap(Effect.map(Config.unwrap(options), layerDataStore))

export const layerPersistenceFromDataStore = Layer.effect(
  Redis.Redis,
  Effect.gen(function* () {
    const redis = yield* DataStoreRedis
    const runSync = Effect.runSyncWith(yield* Effect.context())

    const duplicate = (name: string) =>
      Effect.sync(() =>
        redis
          .duplicate()
          .on('error', error =>
            runSync(
              pipe(Effect.logWarning(`Redis ${name} connection error`), Effect.annotateLogs({ error: error.message })),
            ),
          ),
      )

    return yield* Redis.make({
      send: sendWith(redis),
      connect: Effect.map(duplicate('reserved'), connection => ({
        send: sendWith(connection),
        close: Effect.sync(() => connection.disconnect()),
      })),
      subscribe: Effect.fnUntraced(function* (channel, onMessage) {
        const terminal = yield* Deferred.make<never, Redis.RedisError>()
        const subscriber = yield* Effect.acquireRelease(duplicate('subscriber'), subscriber =>
          Effect.sync(() => subscriber.disconnect()),
        )

        subscriber.on('message', (channel: string, message: string) => onMessage({ channel, message }))
        subscriber.on('end', () =>
          runSync(Deferred.fail(terminal, new Redis.RedisError({ cause: new Error('Subscriber connection ended') }))),
        )

        yield* Effect.tryPromise({
          try: () => subscriber.subscribe(channel),
          catch: cause => new Redis.RedisError({ cause }),
        })

        return Deferred.await(terminal)
      }),
    })
  }),
)

const sendWith =
  (redis: IoRedis) =>
  <A = unknown>(command: string, ...args: ReadonlyArray<string>) =>
    Effect.tryPromise({
      try: () => redis.call(command, ...args) as Promise<A>,
      catch: cause => new Redis.RedisError({ cause }),
    })

export class HttpCacheRedis extends Context.Service<HttpCacheRedis, { primary: IoRedis; readonlyFallback: IoRedis }>()(
  'HttpCacheRedis',
) {}

const layerHttpCache = ({
  primaryUri,
  readonlyFallbackUri,
}: {
  primaryUri: Redacted.Redacted<URL>
  readonlyFallbackUri: Redacted.Redacted<URL>
}) =>
  pipe(
    Effect.all({
      primary: redisLifecycle(primaryUri),
      readonlyFallback: redisLifecycle(readonlyFallbackUri),
    }),
    Layer.effect(HttpCacheRedis),
  )

export const layerHttpCacheConfig = (options: Config.Wrap<Parameters<typeof layerHttpCache>[0]>) =>
  Layer.unwrap(Effect.map(Config.unwrap(options), layerHttpCache))

export const httpCacheRedisUri = Config.URL('HTTP_CACHE_REDIS_URI').pipe(
  Config.orElse(() =>
    Config.all({
      uriTemplate: Config.String('HTTP_CACHE_REDIS_URI_TEMPLATE'),
      region: Config.NonEmptyString('FLY_REGION'),
    }).pipe(Config.map(({ uriTemplate, region }) => new URL(uriTemplate.replace('{region}', region)))),
  ),
)
