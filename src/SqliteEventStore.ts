import { Schema } from '@effect/schema'
import { SqlClient, type SqlError } from '@effect/sql'
import { Array, Effect, flow, pipe } from 'effect'
import * as Uuid from 'uuid-ts'
import * as EventStore from './EventStore.js'
import { FeedbackEvent } from './Feedback/index.js'

export const make: Effect.Effect<EventStore.EventStore, SqlError.SqlError, SqlClient.SqlClient> = Effect.gen(
  function* () {
    const sql = yield* SqlClient.SqlClient

    yield* sql`
      CREATE TABLE IF NOT EXISTS events (
        event_id TEXT NOT NULL PRIMARY KEY,
        resource_id TEXT NOT NULL,
        resource_version number,
        payload TEXT NOT NULL,
        UNIQUE (resource_id, resource_version)
      )
    `

    const getEvents: EventStore.EventStore['getEvents'] = resourceId =>
      Effect.gen(function* () {
        const rows = yield* pipe(
          sql`
            SELECT
              event_id,
              resource_id,
              resource_version,
              payload
            FROM
              events
            WHERE
              resource_id = ${resourceId}
            ORDER BY
              resource_version ASC
          `,
          Effect.andThen(Schema.decodeUnknown(Schema.Array(EventsTable))),
        )

        const latestVersion = Array.match(rows, {
          onEmpty: () => 0,
          onNonEmpty: flow(Array.lastNonEmpty, row => row.resourceVersion),
        })

        return { events: Array.map(rows, row => row.payload), latestVersion }
      }).pipe(Effect.mapError(() => new EventStore.FailedToGetEvents()))

    const commitEvent: EventStore.EventStore['commitEvent'] = (resourceId, lastKnownVersion) => event =>
      Effect.gen(function* () {
        const newResourceVersion = lastKnownVersion + 1
        const eventId = yield* Effect.sync(Uuid.v4())

        const encoded = yield* Schema.encode(EventsTable)({
          eventId,
          resourceId,
          resourceVersion: newResourceVersion,
          payload: event,
        })

        const results = yield* pipe(
          sql`
            INSERT INTO
              events (
                event_id,
                resource_id,
                resource_version,
                payload
              )
            SELECT
              ${encoded.event_id},
              ${encoded.resource_id},
              ${encoded.resource_version},
              ${encoded.payload}
            WHERE
              NOT EXISTS (
                SELECT
                  event_id
                FROM
                  events
                WHERE
                  resource_id = ${encoded.resource_id}
                  AND resource_version = ${encoded.resource_version}
              )
          `.raw,
          Effect.andThen(Schema.decodeUnknown(SqliteResults)),
        )

        if (results.changes !== 1) {
          yield* new EventStore.ResourceHasChanged()
        }

        return newResourceVersion
      }).pipe(
        Effect.catchTags({
          SqlError: () => new EventStore.FailedToCommitEvent(),
          ParseError: () => new EventStore.FailedToCommitEvent(),
        }),
      )

    return { getEvents, commitEvent }
  },
)

const EventsTable = Schema.Struct({
  eventId: Schema.propertySignature(Schema.String).pipe(Schema.fromKey('event_id')),
  resourceId: Schema.propertySignature(Schema.String).pipe(Schema.fromKey('resource_id')),
  resourceVersion: Schema.propertySignature(Schema.Number).pipe(Schema.fromKey('resource_version')),
  payload: Schema.parseJson(FeedbackEvent),
})

const SqliteResults = Schema.Struct({ changes: Schema.Number })
