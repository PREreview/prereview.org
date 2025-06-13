import type { SqlError } from '@effect/sql'
import { LibsqlClient } from '@effect/sql-libsql'
import { Array, DateTime, Effect, flow, Layer, ParseResult, pipe, Schema } from 'effect'
import { CommentEvent } from './Comments/index.js'
import * as EventStore from './EventStore.js'
import { Uuid } from './types/index.js'

export const make: Effect.Effect<
  EventStore.EventStore,
  SqlError.SqlError,
  LibsqlClient.LibsqlClient | Uuid.GenerateUuid
> = Effect.gen(function* () {
  const sql = yield* LibsqlClient.LibsqlClient
  const generateUuid = yield* Uuid.GenerateUuid

  yield* sql`
    CREATE TABLE IF NOT EXISTS resources (
      id TEXT NOT NULL PRIMARY KEY,
      type TEXT NOT NULL,
      version INTEGER NOT NULL
    )
  `

  yield* sql`
    CREATE TABLE IF NOT EXISTS events (
      event_id TEXT NOT NULL PRIMARY KEY,
      resource_id TEXT NOT NULL,
      resource_version INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      event_timestamp TEXT NOT NULL,
      payload TEXT NOT NULL,
      FOREIGN KEY (resource_id) REFERENCES resources(id),
      UNIQUE (resource_id, resource_version)
    )
  `

  const getAllEvents: EventStore.EventStore['getAllEvents'] = Effect.gen(function* () {
    const rows = yield* pipe(
      sql`
        SELECT
          event_id,
          resource_id,
          resource_version,
          event_type,
          event_timestamp,
          payload
        FROM
          events
          INNER JOIN resources ON resources.id = events.resource_id
        WHERE
          resources.type = 'Comment'
        ORDER BY
          resource_version ASC,
          event_timestamp ASC
      `,
      Effect.andThen(Schema.decodeUnknown(Schema.Array(EventsTable))),
    )

    return Array.map(rows, row => ({ resourceId: row.resourceId, event: row.event, version: row.resourceVersion }))
  }).pipe(
    Effect.tapError(error =>
      Effect.annotateLogs(Effect.logError('Unable to get all events'), {
        error,
        resourceType: 'Comment',
      }),
    ),
    Effect.mapError(error => new EventStore.FailedToGetEvents({ cause: error })),
  )

  const getEvents: EventStore.EventStore['getEvents'] = resourceId =>
    Effect.gen(function* () {
      const encodedResourceId = yield* Schema.encode(ResourcesTable.fields.id)(resourceId)

      const rows = yield* pipe(
        sql`
          SELECT
            event_id,
            resource_id,
            resource_version,
            event_type,
            event_timestamp,
            payload
          FROM
            events
          INNER JOIN resources ON resources.id = events.resource_id
          WHERE
            resource_id = ${encodedResourceId}
            AND resources.type = 'Comment'
          ORDER BY
            resource_version ASC
        `,
        Effect.andThen(Schema.decodeUnknown(Schema.Array(EventsTable))),
      )

      const latestVersion = Array.match(rows, {
        onEmpty: () => 0,
        onNonEmpty: flow(Array.lastNonEmpty, row => row.resourceVersion),
      })

      return { events: Array.map(rows, row => row.event), latestVersion }
    }).pipe(
      Effect.tapError(error =>
        Effect.annotateLogs(Effect.logError('Unable to get events'), {
          error,
          resourceId,
          resourceType: 'Comment',
        }),
      ),
      Effect.mapError(error => new EventStore.FailedToGetEvents({ cause: error })),
    )

  const commitEvents: EventStore.EventStore['commitEvents'] =
    (resourceId, lastKnownVersion) =>
    (...events) =>
      sql
        .withTransaction(
          pipe(
            Effect.gen(function* () {
              const encoded = yield* Schema.encode(ResourcesTable)({
                id: resourceId,
                type: 'Comment',
                version: lastKnownVersion,
              })

              const encodedNewVersion = yield* Schema.encode(ResourcesTable.fields.version)(
                lastKnownVersion + events.length,
              )

              if (lastKnownVersion === 0) {
                const results = yield* pipe(
                  sql`
                    INSERT INTO
                      resources (
                        id,
                        type,
                        version
                      )
                    SELECT
                      ${encoded.id},
                      ${encoded.type},
                      ${encodedNewVersion}
                    WHERE
                      NOT EXISTS (
                        SELECT
                          id
                        FROM
                          resources
                        WHERE
                          id = ${encoded.id}
                      )
                  `.raw,
                  Effect.andThen(Schema.decodeUnknown(LibsqlResults)),
                )

                if (results.rowsAffected !== 1) {
                  yield* new EventStore.ResourceHasChanged()
                }

                return
              }

              const rows = yield* sql`
                SELECT
                  id,
                  type
                FROM
                  resources
                WHERE
                  id = ${encoded.id}
                  AND type = ${encoded.type}
              `

              if (rows.length !== 1) {
                yield* new EventStore.FailedToCommitEvent({})
              }

              const results = yield* pipe(
                sql`
                  UPDATE resources
                  SET
                    version = ${encodedNewVersion}
                  WHERE
                    id = ${encoded.id}
                    AND version = ${encoded.version}
                `.raw,
                Effect.andThen(Schema.decodeUnknown(LibsqlResults)),
              )

              if (results.rowsAffected !== 1) {
                yield* new EventStore.ResourceHasChanged()
              }
            }),
            Effect.andThen(() =>
              Effect.reduce(events, lastKnownVersion, (lastKnownVersion, event) =>
                Effect.gen(function* () {
                  const newResourceVersion = lastKnownVersion + 1
                  const eventId = yield* generateUuid
                  const eventTimestamp = yield* DateTime.now

                  const encoded = yield* Schema.encode(EventsTable)({
                    eventId,
                    resourceId,
                    resourceVersion: newResourceVersion,
                    eventTimestamp,
                    event,
                  })

                  const results = yield* pipe(
                    sql`
                      INSERT INTO
                        events (
                          event_id,
                          resource_id,
                          resource_version,
                          event_type,
                          event_timestamp,
                          payload
                        )
                      SELECT
                        ${encoded.event_id},
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
                            resource_id = ${encoded.resource_id}
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
            ),
          ),
        )
        .pipe(
          Effect.tapError(error =>
            Effect.annotateLogs(Effect.logError('Unable to commit events'), {
              error,
              resourceId,
              resourceType: 'Comment',
            }),
          ),
          Effect.catchTag('SqlError', 'ParseError', error => new EventStore.FailedToCommitEvent({ cause: error })),
        )

  return { getAllEvents, getEvents, commitEvents }
})

export const layer = Layer.effect(EventStore.EventStore, make)

const ResourcesTable = Schema.Struct({
  id: Uuid.UuidSchema,
  type: Schema.String,
  version: Schema.Number,
})

const EventsTable = Schema.transformOrFail(
  Schema.Struct({
    eventId: Schema.propertySignature(Uuid.UuidSchema).pipe(Schema.fromKey('event_id')),
    resourceId: Schema.propertySignature(Uuid.UuidSchema).pipe(Schema.fromKey('resource_id')),
    resourceVersion: Schema.propertySignature(Schema.Union(Schema.NumberFromString, Schema.Number)).pipe(
      Schema.fromKey('resource_version'),
    ),
    eventTimestamp: Schema.propertySignature(Schema.DateTimeUtc).pipe(Schema.fromKey('event_timestamp')),
    eventType: Schema.propertySignature(Schema.String).pipe(Schema.fromKey('event_type')),
    payload: Schema.parseJson(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  }),
  Schema.typeSchema(
    Schema.Struct({
      eventId: Uuid.UuidSchema,
      resourceId: Uuid.UuidSchema,
      resourceVersion: Schema.Number,
      eventTimestamp: Schema.DateTimeUtc,
      event: CommentEvent,
    }),
  ),
  {
    strict: true,
    decode: ({ eventType, payload, ...rest }) =>
      Effect.gen(function* () {
        const event = yield* ParseResult.decodeUnknown(CommentEvent)({ _tag: eventType, ...payload })

        return { ...rest, event }
      }),
    encode: ({ event, ...rest }) =>
      Effect.gen(function* () {
        const { _tag, ...payload } = yield* ParseResult.encodeUnknown(CommentEvent)(event)

        return { ...rest, eventType: _tag, payload }
      }),
  },
)

const LibsqlResults = Schema.Struct({ rowsAffected: Schema.Number })
