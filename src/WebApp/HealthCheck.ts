import { HttpMiddleware, HttpServerResponse } from '@effect/platform'
import { Data, Effect, Option } from 'effect'
import { DataStoreRedis } from '../Redis.ts'
import * as StatusCodes from '../StatusCodes.ts'

class RedisUnavailable extends Data.TaggedError('RedisUnavailable')<{
  cause?: unknown
}> {}

export const HealthCheck = Effect.gen(function* () {
  const maybeRedis = yield* Effect.serviceOption(DataStoreRedis)

  if (Option.isNone(maybeRedis)) {
    return yield* HttpServerResponse.unsafeJson({ status: 'ok' })
  }

  const redis = maybeRedis.value

  if (redis.status !== 'ready') {
    return yield* new RedisUnavailable({ cause: `Redis not ready (${redis.status})` })
  }

  yield* Effect.tryPromise({ try: () => redis.ping(), catch: error => new RedisUnavailable({ cause: error }) })

  return yield* HttpServerResponse.unsafeJson({ status: 'ok' })
}).pipe(
  Effect.tapError(error => Effect.logError('Health check failed').pipe(Effect.annotateLogs({ error }))),
  Effect.orElse(() => HttpServerResponse.unsafeJson({ status: 'error' }, { status: StatusCodes.ServiceUnavailable })),
  HttpMiddleware.withLoggerDisabled,
)
