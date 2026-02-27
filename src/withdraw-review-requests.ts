import { NodeRuntime } from '@effect/platform-node'
import { PgClient } from '@effect/sql-pg'
import { Config, Effect, Layer, pipe } from 'effect'
import * as Events from './Events.ts'
import * as ReviewRequests from './ReviewRequests/index.ts'
import * as SqlEventStore from './SqlEventStore.ts'
import * as SqlSensitiveDataStore from './SqlSensitiveDataStore.ts'
import { Temporal, Uuid } from './types/index.ts'

const reviewRequestIds = [
  Uuid.Uuid('a1c02f8b-1400-4303-9b03-f631b6c22ee5'),
  Uuid.Uuid('2f4ecac1-428a-526c-99ec-ff21cba42ba5'),
  Uuid.Uuid('f8bf2dbe-d10e-5e5e-9e20-b06b869b0303'),
  Uuid.Uuid('fee3c5d8-83f2-5f40-98ac-fddb33e3b733'),
  Uuid.Uuid('556f36e7-5be1-5ea2-8edf-0371fefd75ca'),
  Uuid.Uuid('2c90ed30-3b37-5fbb-a008-3cf02ace810d'),
  Uuid.Uuid('59657ff3-edd9-5ba4-b7f0-35c4d522d3e0'),
]

const program = Effect.gen(function* () {
  const withdrawnAt = yield* Temporal.currentInstant

  yield* Effect.forEach(
    reviewRequestIds,
    reviewRequestId =>
      ReviewRequests.withdrawReviewRequest({
        reviewRequestId,
        withdrawnAt,
        reason: 'preprint-withdrawn-from-preprint-server',
      }),
    { concurrency: 10 },
  )
})

pipe(
  program,
  Effect.provide(
    pipe(
      ReviewRequests.commandsLayer,
      Layer.provide(SqlEventStore.layer),
      Layer.provide(Layer.mergeAll(Events.layer, SqlSensitiveDataStore.layer)),
      Layer.provide(
        Layer.mergeAll(
          Uuid.layer,
          PgClient.layerConfig({
            url: Config.redacted(Config.string('POSTGRES_URL')),
          }),
        ),
      ),
    ),
  ),
  NodeRuntime.runMain,
)
