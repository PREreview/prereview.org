import { SqlClient, type SqlError, type Statement } from '@effect/sql'
import { PgClient } from '@effect/sql-pg'
import { Array, DateTime, Effect, Option, ParseResult, pipe, Record, Schema, Struct } from 'effect'
import * as EventStore from './EventStore.js'
import { Uuid } from './types/index.js'

export const make = <T extends string, A extends { _tag: T }, I extends { _tag: T }>(
  eventTypes: Array.NonEmptyReadonlyArray<T>,
  eventSchema: Schema.Schema<A, I>,
): Effect.Effect<EventStore.EventStore<A>, SqlError.SqlError, SqlClient.SqlClient | Uuid.GenerateUuid> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const generateUuid = yield* Uuid.GenerateUuid
    const eventsTable = EventsTable(eventSchema)

    yield* sql.onDialectOrElse({
      pg: () =>
        sql.withTransaction(
          pipe(
            sql`
              SELECT
                1
              FROM
                INFORMATION_SCHEMA.COLUMNS
              WHERE
                table_name = 'events'
                AND column_name = 'resource_id'
            `,
            Effect.andThen(
              Array.match({
                onEmpty: () => Effect.void,
                onNonEmpty: () => sql`
                  DROP INDEX IF EXISTS events_resource_id_idx;

                  DROP INDEX IF EXISTS resources_type_idx;

                  ALTER TABLE events
                  DROP resource_id,
                  DROP resource_version;

                  DROP TABLE IF EXISTS resources;
                `,
              }),
            ),
          ),
        ),
      orElse: () => Effect.void,
    })

    yield* sql`
      CREATE TABLE IF NOT EXISTS events (
        event_id TEXT NOT NULL PRIMARY KEY,
        event_type TEXT NOT NULL,
        event_timestamp TIMESTAMPTZ NOT NULL,
        payload JSONB NOT NULL
      )
    `

    const buildFilterCondition = <T extends A['_tag']>(filter: EventStore.EventFilter<A, T>) =>
      filter.predicates && Struct.keys(filter.predicates).length > 0
        ? sql.and([
            sql.in('event_type', filter.types),
            ...Record.reduce(filter.predicates, Array.empty<Statement.Fragment>(), (conditions, value, key) =>
              typeof value === 'string' ? Array.append(conditions, sql`payload ->> ${key} = ${value}`) : conditions,
            ),
          ])
        : sql.in('event_type', filter.types)

    const selectEventRows = Effect.fn(
      function* <T extends A['_tag']>(filter: EventStore.EventFilter<A, T>) {
        const rows = yield* pipe(
          sql`
            SELECT
              event_id,
              event_type,
              event_timestamp,
              payload
            FROM
              events
            WHERE
              ${buildFilterCondition(filter)}
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

    const all: EventStore.EventStore<A>['all'] = pipe(
      sql`
        SELECT
          event_id,
          event_type,
          event_timestamp,
          payload
        FROM
          events
        WHERE
          ${sql.in('event_type', eventTypes)}
        ORDER BY
          event_timestamp ASC
      `,
      Effect.andThen(Schema.decodeUnknown(Schema.Array(EventsTable(eventSchema)))),
      Effect.andThen(Array.map(Struct.get('event'))),
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
        onNonEmpty: rows =>
          Effect.succeed({
            events: Array.map(rows, Struct.get('event')),
            lastKnownEvent: Array.lastNonEmpty(rows).eventId,
          }),
      })
    })

    const append: EventStore.EventStore<A>['append'] = Effect.fn(
      function* (event, appendCondition) {
        const eventId = yield* generateUuid
        const eventTimestamp = yield* DateTime.now

        const encoded = yield* Schema.encode(eventsTable)({
          eventId,
          eventTimestamp,
          event,
        })

        if (!appendCondition) {
          return yield* pipe(
            sql`
              INSERT INTO
                events (event_id, event_type, event_timestamp, payload)
              SELECT
                ${encoded.event_id},
                ${encoded.event_type},
                ${encoded.event_timestamp},
                ${isPgClient(sql) ? sql.json(encoded.payload) : sql`${JSON.stringify(encoded.payload)}`}
            `.raw,
            Effect.andThen(Schema.decodeUnknown(SqlQueryResults)),
          )
        }

        const condition = Option.match(appendCondition.lastKnownEvent, {
          onNone: () => sql`
            NOT EXISTS (
              SELECT
                1
              FROM
                events
              WHERE
                ${buildFilterCondition(appendCondition.filter)}
            )
          `,
          onSome: lastKnownEvent => sql`
            (
              SELECT
                event_id
              FROM
                events
              WHERE
                ${buildFilterCondition(appendCondition.filter)}
              ORDER BY
                event_timestamp DESC
              LIMIT
                1
            ) = ${lastKnownEvent}
          `,
        })

        const results = yield* pipe(
          sql`
            INSERT INTO
              events (event_id, event_type, event_timestamp, payload)
            SELECT
              ${encoded.event_id},
              ${encoded.event_type},
              ${encoded.event_timestamp},
              ${isPgClient(sql) ? sql.json(encoded.payload) : sql`${JSON.stringify(encoded.payload)}`}
            WHERE
              (${condition})
          `.raw,
          Effect.andThen(Schema.decodeUnknown(SqlQueryResults)),
        )
        if (results.rowsAffected !== 1) {
          return yield* new EventStore.ResourceHasChanged()
        }
      },
      Effect.tapError(error => Effect.annotateLogs(Effect.logError('Unable to commit events'), { error })),
      Effect.catchTag('SqlError', 'ParseError', error => new EventStore.FailedToCommitEvent({ cause: error })),
    )

    return { all, query, append }
  })

const hasTag =
  <Tag extends string>(...tags: ReadonlyArray<Tag>) =>
  <T extends { _tag: string }>(tagged: T): tagged is Extract<T, { _tag: Tag }> =>
    Array.contains(tags, tagged._tag)

const EventsTable = <A, I extends { readonly _tag: string }>(eventSchema: Schema.Schema<A, I>) =>
  Schema.transformOrFail(
    Schema.Struct({
      eventId: Schema.propertySignature(Uuid.UuidSchema).pipe(Schema.fromKey('event_id')),
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

const isPgClient = (sql: SqlClient.SqlClient): sql is PgClient.PgClient => PgClient.TypeId in sql

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
