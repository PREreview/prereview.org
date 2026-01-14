/* eslint-disable import/no-internal-modules */
import { NodeRuntime } from '@effect/platform-node'
import { Config, Effect, Logger, LogLevel, pipe, Schema } from 'effect'
import { CoarNotify } from '../src/ExternalApis/index.ts'
import * as Redis from '../src/Redis.ts'
import { Temporal } from '../src/types/index.ts'

const ReviewRequestSchema = Schema.Struct({
  timestamp: Temporal.InstantFromMillisecondsSchema,
  notification: CoarNotify.RequestReviewSchema,
})

const getReviewRequests = pipe(
  Redis.DataStoreRedis,
  Effect.andThen(redis => Effect.tryPromise(() => redis.lrange('notifications', 0, 4))),
  Effect.andThen(Schema.decode(Schema.Array(Schema.parseJson(ReviewRequestSchema)))),
)

const program = Effect.gen(function* () {
  const reviewRequests = yield* getReviewRequests

  yield* Effect.logDebug('Found review requests').pipe(Effect.annotateLogs({ reviewRequests }))
})

pipe(
  program,
  Effect.provide(Redis.layerDataStoreConfig(Config.redacted(Config.url('REVIEW_REQUEST_REDIS_URI')))),
  Effect.scoped,
  Logger.withMinimumLogLevel(LogLevel.Debug),
  NodeRuntime.runMain(),
)
