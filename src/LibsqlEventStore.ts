import { Schema } from '@effect/schema'
import { SqlClient, type SqlError } from '@effect/sql'
import { Array, DateTime, Effect, flow, pipe } from 'effect'
import * as EventStore from './EventStore.js'
import { FeedbackEvent } from './Feedback/index.js'
import { Uuid } from './types/index.js'

export const make: Effect.Effect<EventStore.EventStore, SqlError.SqlError, SqlClient.SqlClient | Uuid.GenerateUuid> =
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const generateUuid = yield* Uuid.GenerateUuid

    yield* sql`
      CREATE TABLE IF NOT EXISTS events (
        event_id TEXT NOT NULL PRIMARY KEY,
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        resource_version number,
        event_type TEXT NOT NULL,
        event_timestamp TEXT NOT NULL,
        payload TEXT NOT NULL,
        UNIQUE (resource_type, resource_id, resource_version)
      )
    `

    const getAllEvents: EventStore.EventStore['getAllEvents'] = Effect.gen(function* () {
      const rows = yield* pipe(
        sql`
            SELECT
              event_id,
              resource_type,
              resource_id,
              resource_version,
              event_type,
              event_timestamp,
              payload
            FROM
              events
            ORDER BY
              resource_version ASC
          `,
        Effect.andThen(Schema.decodeUnknown(Schema.Array(EventsTable))),
      )

      return Array.map(rows, row => ({ resourceId: row.resourceId, event: row.payload, version: row.resourceVersion }))
    }).pipe(
      Effect.tapError(error =>
        Effect.annotateLogs(Effect.logError('Unable to get all events'), {
          error,
          resourceType: 'Feedback',
        }),
      ),
      Effect.mapError(() => new EventStore.FailedToGetEvents()),
    )

    const getEvents: EventStore.EventStore['getEvents'] = resourceId =>
      Effect.gen(function* () {
        const rows = yield* pipe(
          sql`
            SELECT
              event_id,
              resource_type,
              resource_id,
              resource_version,
              event_type,
              event_timestamp,
              payload
            FROM
              events
            WHERE
              resource_type = 'Feedback'
              AND resource_id = ${resourceId}
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
      }).pipe(
        Effect.tapError(error =>
          Effect.annotateLogs(Effect.logError('Unable to get events'), {
            error,
            resourceId,
            resourceType: 'Feedback',
          }),
        ),
        Effect.mapError(() => new EventStore.FailedToGetEvents()),
      )

    const commitEvents: EventStore.EventStore['commitEvents'] =
      (resourceId, lastKnownVersion) =>
      (...events) =>
        sql
          .withTransaction(
            Effect.reduce(events, lastKnownVersion, (lastKnownVersion, event) =>
              Effect.gen(function* () {
                const newResourceVersion = lastKnownVersion + 1
                const eventId = yield* generateUuid
                const eventTimestamp = yield* DateTime.now

                const encoded = yield* Schema.encode(EventsTable)({
                  eventId,
                  resourceType: 'Feedback',
                  resourceId,
                  resourceVersion: newResourceVersion,
                  eventType: event._tag,
                  eventTimestamp,
                  payload: event,
                })

                const results = yield* pipe(
                  sql`
                    INSERT INTO
                      events (
                        event_id,
                        resource_type,
                        resource_id,
                        resource_version,
                        event_type,
                        event_timestamp,
                        payload
                      )
                    SELECT
                      ${encoded.event_id},
                      ${encoded.resource_type},
                      ${encoded.resource_id},
                      ${encoded.resource_version},
                      ${encoded.event_type},
                      ${encoded.event_timestamp},
                      ${encoded.payload}
                    WHERE
                      NOT EXISTS (
                        SELECT
                          event_id
                        FROM
                          events
                        WHERE
                          resource_type = ${encoded.resource_type}
                          AND resource_id = ${encoded.resource_id}
                          AND resource_version >= ${encoded.resource_version}
                      )
                  `.raw,
                  Effect.andThen(Schema.decodeUnknown(LibsqlResults)),
                )

                if (results.rowsAffected !== 1) {
                  yield* new EventStore.ResourceHasChanged()
                }

                return newResourceVersion
              }),
            ),
          )
          .pipe(
            Effect.tapError(error =>
              Effect.annotateLogs(Effect.logError('Unable to commit events'), {
                error,
                resourceId,
                resourceType: 'Feedback',
              }),
            ),
            Effect.catchTags({
              SqlError: () => new EventStore.FailedToCommitEvent(),
              ParseError: () => new EventStore.FailedToCommitEvent(),
            }),
          )

    return { getAllEvents, getEvents, commitEvents }
  })

const EventsTable = Schema.Struct({
  eventId: Schema.propertySignature(Uuid.UuidSchema).pipe(Schema.fromKey('event_id')),
  resourceType: Schema.propertySignature(Schema.String).pipe(Schema.fromKey('resource_type')),
  resourceId: Schema.propertySignature(Uuid.UuidSchema).pipe(Schema.fromKey('resource_id')),
  resourceVersion: Schema.propertySignature(Schema.Number).pipe(Schema.fromKey('resource_version')),
  eventType: Schema.propertySignature(Schema.String).pipe(Schema.fromKey('event_type')),
  eventTimestamp: Schema.propertySignature(Schema.DateTimeUtc).pipe(Schema.fromKey('event_timestamp')),
  payload: Schema.parseJson(FeedbackEvent),
})

const LibsqlResults = Schema.Struct({ rowsAffected: Schema.Number })
