import { SqlClient, type SqlError, type Statement } from '@effect/sql'
import { Array, DateTime, Effect, flow, ParseResult, pipe, Record, Schema, Struct } from 'effect'
import * as EventStore from './EventStore.js'
import { Uuid } from './types/index.js'

export const make = <T extends string, A extends { _tag: T }, I extends { _tag: T }>(
  resourceType: string,
  resourceIdProperty: Extract<keyof Omit<I, '_tag'>, string>,
  eventTypes: Array.NonEmptyReadonlyArray<T>,
  eventSchema: Schema.Schema<A, I>,
): Effect.Effect<EventStore.EventStore<A>, SqlError.SqlError, SqlClient.SqlClient | Uuid.GenerateUuid> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const generateUuid = yield* Uuid.GenerateUuid
    const resourcesTable = ResourcesTable(resourceType)
    const eventsTable = EventsTable(eventSchema)

    yield* sql`
      CREATE TABLE IF NOT EXISTS resources (
        id TEXT NOT NULL PRIMARY KEY,
        type TEXT NOT NULL,
        version INTEGER NOT NULL
      )
    `

    yield* sql`CREATE INDEX IF NOT EXISTS resources_type_idx ON resources (type)`

    yield* sql`
      CREATE TABLE IF NOT EXISTS events (
        event_id TEXT NOT NULL PRIMARY KEY,
        resource_id TEXT NOT NULL,
        resource_version INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        event_timestamp TIMESTAMPTZ NOT NULL,
        payload JSONB NOT NULL,
        FOREIGN KEY (resource_id) REFERENCES resources (id),
        UNIQUE (resource_id, resource_version)
      )
    `

    yield* sql.onDialectOrElse({
      pg: () => sql`
        CREATE INDEX IF NOT EXISTS events_resource_id_idx ON events (resource_id) STORING (
          resource_version,
          event_type,
          event_timestamp,
          payload
        )
      `,
      orElse: () => Effect.void,
    })

    const selectEventRows = Effect.fn(
      function* <T extends A['_tag']>(filter: EventStore.EventFilter<A, T>) {
        const condition =
          filter.predicates && Object.keys(filter.predicates).length > 0
            ? sql.and([
                sql.in('event_type', filter.types),
                ...Record.reduce(filter.predicates, Array.empty<Statement.Fragment>(), (conditions, value, key) =>
                  typeof value === 'string' ? Array.append(conditions, sql`payload ->> ${key} = ${value}`) : conditions,
                ),
              ])
            : sql.in('event_type', filter.types)

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
            WHERE
              ${condition}
            ORDER BY
              event_timestamp ASC
          `,
          Effect.andThen(
            Schema.decodeUnknown(Schema.Array(EventsTable(eventSchema.pipe(Schema.filter(hasTag(...filter.types)))))),
          ),
        )

        return rows
      },
      Effect.tapError(error =>
        Effect.annotateLogs(Effect.logError('Unable to get all events'), {
          error,
        }),
      ),
      Effect.mapError(error => new EventStore.FailedToGetEvents({ cause: error })),
    )

    const query: EventStore.EventStore<A>['query'] = Effect.fn(function* (filter) {
      const rows = yield* selectEventRows(filter)

      return yield* Array.match(rows, {
        onEmpty: () => Effect.fail(new EventStore.NoEventsFound()),
        onNonEmpty: rows => Effect.succeed({ events: Array.map(rows, Struct.get('event')) }),
      })
    })

    const getAllEvents: EventStore.EventStore<A>['getAllEvents'] = Effect.gen(function* () {
      const rows = yield* selectEventRows({ types: eventTypes })

      return Array.map(rows, row => ({
        resourceId: row.resourceId,
        event: row.event,
        version: row.resourceVersion,
      }))
    }).pipe(
      Effect.tapError(error =>
        Effect.annotateLogs(Effect.logError('Unable to get all events'), {
          error,
          resourceType,
        }),
      ),
      Effect.mapError(error => new EventStore.FailedToGetEvents({ cause: error })),
    )

    const getAllEventsOfType: EventStore.EventStore<A>['getAllEventsOfType'] = Effect.fn(
      function* (...types) {
        const rows = yield* selectEventRows({ types })

        return Array.map(rows, row => ({
          resourceId: row.resourceId,
          event: row.event,
          version: row.resourceVersion,
        }))
      },
      Effect.tapError(error =>
        Effect.annotateLogs(Effect.logError('Unable to get all events'), {
          error,
          resourceType,
        }),
      ),
      Effect.mapError(error => new EventStore.FailedToGetEvents({ cause: error })),
    )

    const getEvents: EventStore.EventStore<A>['getEvents'] = resourceId =>
      Effect.gen(function* () {
        const rows = yield* selectEventRows({
          types: eventTypes,
          predicates: { [resourceIdProperty]: resourceId } as never,
        })

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
            resourceType,
          }),
        ),
        Effect.mapError(error => new EventStore.FailedToGetEvents({ cause: error })),
      )

    const commitEvent: EventStore.EventStore<A>['commitEvent'] = (resourceId, lastKnownVersion) => event =>
      sql
        .withTransaction(
          pipe(
            Effect.gen(function* () {
              const encoded = yield* Schema.encode(resourcesTable)({
                id: resourceId,
                type: resourceType,
                version: lastKnownVersion,
              })

              const encodedNewVersion = yield* Schema.encode(resourcesTable.fields.version)(lastKnownVersion + 1)

              if (lastKnownVersion === 0) {
                const results = yield* pipe(
                  sql`
                    INSERT INTO
                      resources (id, type, version)
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
                  Effect.andThen(Schema.decodeUnknown(SqlQueryResults)),
                )

                if (results.rowsAffected !== 1) {
                  return yield* new EventStore.ResourceHasChanged()
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
                return yield* new EventStore.FailedToCommitEvent({})
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
                Effect.andThen(Schema.decodeUnknown(SqlQueryResults)),
              )

              if (results.rowsAffected !== 1) {
                return yield* new EventStore.ResourceHasChanged()
              }
            }),
            Effect.andThen(() =>
              Effect.gen(function* () {
                const newResourceVersion = lastKnownVersion + 1
                const eventId = yield* generateUuid
                const eventTimestamp = yield* DateTime.now

                const encoded = yield* Schema.encode(eventsTable)({
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
                      ${sql.onDialectOrElse({
                      pg: () => sql`'${sql.unsafe(JSON.stringify(encoded.payload))}'::jsonb`,
                      orElse: () => sql`${JSON.stringify(encoded.payload)}`,
                    })}
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
                  Effect.andThen(Schema.decodeUnknown(SqlQueryResults)),
                )

                if (results.rowsAffected !== 1) {
                  return yield* new EventStore.ResourceHasChanged()
                }

                return newResourceVersion
              }),
            ),
          ),
        )
        .pipe(
          Effect.tapError(error =>
            Effect.annotateLogs(Effect.logError('Unable to commit events'), {
              error,
              resourceId,
              resourceType,
            }),
          ),
          Effect.catchTag('SqlError', 'ParseError', error => new EventStore.FailedToCommitEvent({ cause: error })),
        )

    return { query, getAllEvents, getAllEventsOfType, getEvents, commitEvent }
  })

const hasTag =
  <Tag extends string>(...tags: ReadonlyArray<Tag>) =>
  <T extends { _tag: string }>(tagged: T): tagged is Extract<T, { _tag: Tag }> =>
    Array.contains(tags, tagged._tag)

const ResourcesTable = (resourceType: string) =>
  Schema.Struct({
    id: Uuid.UuidSchema,
    type: Schema.Literal(resourceType),
    version: Schema.Number,
  })

const EventsTable = <A, I extends { readonly _tag: string }>(eventSchema: Schema.Schema<A, I>) =>
  Schema.transformOrFail(
    Schema.Struct({
      eventId: Schema.propertySignature(Uuid.UuidSchema).pipe(Schema.fromKey('event_id')),
      resourceId: Schema.propertySignature(Uuid.UuidSchema).pipe(Schema.fromKey('resource_id')),
      resourceVersion: Schema.propertySignature(Schema.Union(Schema.NumberFromString, Schema.Number)).pipe(
        Schema.fromKey('resource_version'),
      ),
      eventTimestamp: Schema.propertySignature(Schema.Union(Schema.DateTimeUtc, Schema.DateTimeUtcFromDate)).pipe(
        Schema.fromKey('event_timestamp'),
      ),
      eventType: Schema.propertySignature(Schema.String).pipe(Schema.fromKey('event_type')),
      payload: Schema.Union(
        Schema.Record({ key: Schema.String, value: Schema.Unknown }),
        Schema.parseJson(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
      ),
    }),
    Schema.typeSchema(
      Schema.Struct({
        eventId: Uuid.UuidSchema,
        resourceId: Uuid.UuidSchema,
        resourceVersion: Schema.Number,
        eventTimestamp: Schema.DateTimeUtc,
        event: eventSchema,
      }),
    ),
    {
      strict: true,
      decode: ({ eventType, payload, ...rest }) =>
        Effect.gen(function* () {
          const event = yield* ParseResult.decodeUnknown(eventSchema)({ _tag: eventType, ...payload })

          return { ...rest, event }
        }),
      encode: ({ event, ...rest }) =>
        Effect.gen(function* () {
          const { _tag, ...payload } = yield* ParseResult.encodeUnknown(eventSchema)(event)

          return { ...rest, eventType: _tag, payload }
        }),
    },
  )

const LibsqlResults = Schema.Struct({ rowsAffected: Schema.Number })

const PgResultsTypeFromSelf = Schema.declare(
  (input: unknown): input is Array<unknown> & { count: number } =>
    Array.isArray(input) && 'count' in input && typeof input.count === 'number',
)

const PgResults = Schema.transformOrFail(PgResultsTypeFromSelf, Schema.Struct({ rowsAffected: Schema.Number }), {
  strict: true,
  decode: results => ParseResult.succeed({ rowsAffected: results.count }),
  encode: (results, _, ast) =>
    ParseResult.fail(new ParseResult.Forbidden(ast, results, 'Encoding PgResults is forbidden.')),
})

const SqlQueryResults = Schema.Union(LibsqlResults, PgResults)
