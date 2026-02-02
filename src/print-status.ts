import { NodeRuntime } from '@effect/platform-node'
import { PgClient } from '@effect/sql-pg'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Config, Console, Effect, flow, Layer, pipe } from 'effect'
import * as EventDispatcher from './EventDispatcher.ts'
import * as Events from './Events.ts'
import * as ReviewRequest from './ReviewRequests/index.ts'
import * as SqlEventStore from './SqlEventStore.ts'
import * as SqlSensitiveDataStore from './SqlSensitiveDataStore.ts'
import { Uuid } from './types/index.ts'

const program = pipe(
  Console.log('Review requests needing categorization'),
  Effect.andThen(ReviewRequest.findReviewRequestsNeedingCategorization),
  Effect.tapBoth({
    onSuccess: flow(
      Array.map(result => ({
        ID: result.id,
        Published: result.publishedAt
          .toZonedDateTimeISO('UTC')
          .until(Temporal.Now.zonedDateTimeISO('UTC'), {
            largestUnit: 'day',
            smallestUnit: 'hour',
          })
          .toLocaleString('en-US'),
      })),
      Console.table,
    ),
    onFailure: Console.log,
  }),
)

pipe(
  program,
  Effect.provide(
    pipe(
      ReviewRequest.queriesLayer,
      Layer.provide(SqlEventStore.layer),
      Layer.provide(Layer.mergeAll(Events.layer, SqlSensitiveDataStore.layer, EventDispatcher.EventDispatcherLayer)),
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
