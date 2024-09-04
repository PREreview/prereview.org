import { SystemClock } from 'clock-ts'
import { Effect, pipe } from 'effect'
import * as C from 'fp-ts/lib/Console.js'
import { toError } from 'fp-ts/lib/Either.js'
import { Redis as IoRedis } from 'ioredis'
import * as L from 'logger-fp-ts'
import { DeprecatedEnvVars } from './env.js'

export const redisLifecycle = Effect.acquireRelease(
  Effect.gen(function* () {
    const env = yield* DeprecatedEnvVars
    const loggerEnv: L.LoggerEnv = {
      clock: SystemClock,
      logger: pipe(
        C.log,
        L.withShow(env.LOG_FORMAT === 'json' ? L.JsonShowLogEntry : L.getColoredShow(L.ShowLogEntry)),
      ),
    }
    const redis = new IoRedis(env.REDIS_URI.href, { commandTimeout: 2 * 1000, enableAutoPipelining: true })

    redis.on('connect', () => L.debug('Redis connected')(loggerEnv)())
    redis.on('close', () => L.debug('Redis connection closed')(loggerEnv)())
    redis.on('reconnecting', () => L.info('Redis reconnecting')(loggerEnv)())
    redis.removeAllListeners('error')
    redis.on('error', (error: Error) => L.errorP('Redis connection error')({ error: error.message })(loggerEnv)())

    return redis
  }),
  redis =>
    Effect.gen(function* () {
      const env = yield* DeprecatedEnvVars
      const loggerEnv: L.LoggerEnv = {
        clock: SystemClock,
        logger: pipe(
          C.log,
          L.withShow(env.LOG_FORMAT === 'json' ? L.JsonShowLogEntry : L.getColoredShow(L.ShowLogEntry)),
        ),
      }
      yield* Effect.promise(() =>
        redis
          .quit()
          .then(() => L.debug('Redis disconnected')(loggerEnv)())
          .catch((error: unknown) =>
            L.warnP('Redis unable to disconnect')({ error: toError(error).message })(loggerEnv)(),
          ),
      )
    }),
)
