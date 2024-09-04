import { Context, Effect } from 'effect'
import { toError } from 'fp-ts/lib/Either.js'
import { Redis as IoRedis } from 'ioredis'
import * as L from 'logger-fp-ts'
import { DeprecatedEnvVars } from './env.js'

export class DeprecatedLoggerEnv extends Context.Tag('DeprecatedLoggerEnv')<DeprecatedLoggerEnv, L.LoggerEnv>() {}

const makeRedis = Effect.gen(function* () {
  const env = yield* DeprecatedEnvVars
  const loggerEnv = yield* DeprecatedLoggerEnv
  const redis = new IoRedis(env.REDIS_URI.href, { commandTimeout: 2 * 1000, enableAutoPipelining: true })

  redis.on('connect', () => L.debug('Redis connected')(loggerEnv)())
  redis.on('close', () => L.debug('Redis connection closed')(loggerEnv)())
  redis.on('reconnecting', () => L.info('Redis reconnecting')(loggerEnv)())
  redis.removeAllListeners('error')
  redis.on('error', (error: Error) => L.errorP('Redis connection error')({ error: error.message })(loggerEnv)())

  return redis
})

const teardownRedis = (redis: IoRedis) =>
  Effect.gen(function* () {
    const loggerEnv = yield* DeprecatedLoggerEnv
    yield* Effect.promise(() =>
      redis
        .quit()
        .then(() => L.debug('Redis disconnected')(loggerEnv)())
        .catch((error: unknown) =>
          L.warnP('Redis unable to disconnect')({ error: toError(error).message })(loggerEnv)(),
        ),
    )
  })

export const redisLifecycle = Effect.acquireRelease(makeRedis, teardownRedis)
