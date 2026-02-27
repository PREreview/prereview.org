import { NodeRuntime } from '@effect/platform-node'
import { PgClient } from '@effect/sql-pg'
import { Config, Effect, Layer, pipe } from 'effect'
import * as Events from './Events.ts'
import * as ReviewRequests from './ReviewRequests/index.ts'
import * as SqlEventStore from './SqlEventStore.ts'
import * as SqlSensitiveDataStore from './SqlSensitiveDataStore.ts'
import { Temporal, Uuid } from './types/index.ts'

const reviewRequestId = Uuid.Uuid('a1c02f8b-1400-4303-9b03-f631b6c22ee5')

const program = Effect.gen(function* () {
  const withdrawnAt = yield* Temporal.currentInstant

  yield* ReviewRequests.withdrawReviewRequest({
    reviewRequestId,
    withdrawnAt,
    reason: 'preprint-withdrawn-from-preprint-server',
  })
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
