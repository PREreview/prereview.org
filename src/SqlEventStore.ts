import { SqlClient, type SqlError, type Statement } from '@effect/sql'
import { PgClient } from '@effect/sql-pg'
import {
  Array,
  Context,
  DateTime,
  Effect,
  Layer,
  Option,
  ParseResult,
  pipe,
  PubSub,
  Record,
  Schema,
  Scope,
  Struct,
  type Types,
} from 'effect'
import * as EventStore from './EventStore.ts'
import * as Events from './Events.ts'
import type * as SensitiveDataStore from './SensitiveDataStore.ts'
import { Uuid } from './types/index.ts'

export const make: Effect.Effect<
  EventStore.EventStore,
  SqlError.SqlError,
  Events.Events | SqlClient.SqlClient | Uuid.GenerateUuid | SensitiveDataStore.SensitiveDataStore
> = Effect.gen(function* () {
  const context = yield* Effect.andThen(
    Effect.context<SensitiveDataStore.SensitiveDataStore>(),
    Context.omit(Scope.Scope),
  )

  const sql = yield* SqlClient.SqlClient
  const generateUuid = yield* Uuid.GenerateUuid
  const eventsTable = EventsTable(Events.Event)
  const events = yield* Events.Events

  yield* sql`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT NOT NULL PRIMARY KEY,
      type TEXT NOT NULL,
      timestamp TIMESTAMPTZ NOT NULL,
      payload JSONB NOT NULL
    )
  `

  yield* sql.onDialectOrElse({
    pg: () => sql`
      CREATE INDEX IF NOT EXISTS idx_events_type ON events (type);

      CREATE INDEX IF NOT EXISTS idx_events_payload_gin ON events USING gin (payload);
    `,
    orElse: () => Effect.void,
  })

  const buildFilterCondition = <T extends Types.Tags<Events.Event>>(filter: Events.EventFilter<T>) =>
    sql.or(
      Array.map(Array.ensure(filter), filter =>
        filter.predicates && Struct.keys(filter.predicates).length > 0
          ? sql.and([
              sql.in('type', filter.types),
              ...sql.onDialectOrElse({
                pg: () => [sql`payload @> ${filter.predicates}`],
                orElse: () =>
                  Record.reduce(filter.predicates ?? {}, Array.empty<Statement.Fragment>(), (conditions, value, key) =>
                    typeof value === 'string'
                      ? Array.append(conditions, sql`payload ->> ${key} = ${value}`)
                      : conditions,
                  ),
              }),
            ])
          : sql.in('type', filter.types),
      ),
    )

  const selectEventRows = <T extends Types.Tags<Events.Event>>(filter: Events.EventFilter<T>) =>
    pipe(
      sql`
        SELECT
          id,
          type,
          timestamp,
          payload
        FROM
          events
        WHERE
          ${buildFilterCondition(filter)}
        ORDER BY
          timestamp ASC
      `,
      Effect.andThen(
        Schema.decodeUnknown(
          Schema.Array(
            EventsTable(
              Events.Event.pipe(Schema.filter(hasTag(...Array.flatMap(Array.ensure(filter), Struct.get('types'))))),
            ),
          ).annotations({ batching: true, concurrency: 'inherit' }),
        ),
      ),
      Effect.tapError(error => Effect.annotateLogs(Effect.logError('Unable to filter events'), { error, filter })),
      Effect.mapError(error => new EventStore.FailedToGetEvents({ cause: error })),
    )

  const all: EventStore.EventStore['all'] = pipe(
    sql`
      SELECT
        id,
        type,
        timestamp,
        payload
      FROM
        events
      ORDER BY
        timestamp ASC
    `,
    Effect.andThen(
      Schema.decodeUnknown(
        Schema.Array(EventsTable(Events.Event)).annotations({ batching: true, concurrency: 'inherit' }),
      ),
    ),
    Effect.andThen(Array.map(Struct.get('event'))),
    Effect.tapError(error =>
      Effect.annotateLogs(Effect.logError('Unable to get all events'), {
        error,
      }),
    ),
    Effect.mapError(error => new EventStore.FailedToGetEvents({ cause: error })),
    Effect.provide(context),
    Effect.withSpan('SqlEventStore.all'),
  )

  const query: EventStore.EventStore['query'] = Effect.fn('SqlEventStore.query')(function* (filter) {
    const rows = yield* selectEventRows(filter)

    return yield* Array.match(rows, {
      onEmpty: () => Effect.fail(new EventStore.NoEventsFound()),
      onNonEmpty: rows =>
        Effect.succeed({
          events: Array.map(rows, Struct.get('event')),
          lastKnownEvent: Array.lastNonEmpty(rows).id,
        }),
    })
  }, Effect.provide(context))

  const append: EventStore.EventStore['append'] = Effect.fn('SqlEventStore.append')(
    function* (event, appendCondition) {
      const id = yield* generateUuid
      const timestamp = yield* DateTime.now

      const encoded = yield* Schema.encode(eventsTable)({
        id,
        timestamp,
        event,
      })

      if (!appendCondition) {
        return yield* pipe(
          sql`
            INSERT INTO
              events (id, type, timestamp, payload)
            SELECT
              ${encoded.id},
              ${encoded.type},
              ${encoded.timestamp},
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
              id
            FROM
              events
            WHERE
              ${buildFilterCondition(appendCondition.filter)}
            ORDER BY
              timestamp DESC
            LIMIT
              1
          ) = ${lastKnownEvent}
        `,
      })

      const results = yield* pipe(
        sql`
          INSERT INTO
            events (id, type, timestamp, payload)
          SELECT
            ${encoded.id},
            ${encoded.type},
            ${encoded.timestamp},
            ${isPgClient(sql) ? sql.json(encoded.payload) : sql`${JSON.stringify(encoded.payload)}`}
          WHERE
            (${condition})
        `.raw,
        Effect.andThen(Schema.decodeUnknown(SqlQueryResults)),
      )
      if (results.rowsAffected !== 1) {
        return yield* new EventStore.NewEventsFound()
      }

      yield* PubSub.publish(events, event)
    },
    Effect.tapError(error => Effect.annotateLogs(Effect.logError('Unable to commit events'), { error })),
    Effect.catchTag('SqlError', 'ParseError', error => new EventStore.FailedToCommitEvent({ cause: error })),
    Effect.provide(context),
  )

  return { all, query, append }
})

export const layer = Layer.effect(EventStore.EventStore, make)

const hasTag =
  <Tag extends string>(...tags: ReadonlyArray<Tag>) =>
  <T extends { _tag: string }>(tagged: T): tagged is Extract<T, { _tag: Tag }> =>
    Array.contains(tags, tagged._tag)

const EventsTable = <A, I extends { readonly _tag: string }, R>(eventSchema: Schema.Schema<A, I, R>) =>
  Schema.transformOrFail(
    Schema.Struct({
      id: Uuid.UuidSchema,
      timestamp: Schema.Union(Schema.DateTimeUtc, Schema.DateTimeUtcFromDate),
      type: Schema.String,
      payload: Schema.Union(
        Schema.Record({ key: Schema.String, value: Schema.Unknown }),
        Schema.parseJson(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
      ),
    }),
    Schema.typeSchema(
      Schema.Struct({
        id: Uuid.UuidSchema,
        timestamp: Schema.DateTimeUtc,
        event: eventSchema,
      }),
    ),
    {
      strict: true,
      decode: ({ type, payload, ...rest }) =>
        Effect.gen(function* () {
          const event = yield* ParseResult.decodeUnknown(eventSchema)({ _tag: type, ...payload })

          return { ...rest, event }
        }),
      encode: ({ event, ...rest }) =>
        Effect.gen(function* () {
          const { _tag, ...payload } = yield* ParseResult.encodeUnknown(eventSchema)(event)

          return { ...rest, type: _tag, payload }
        }),
    },
  )

const isPgClient = (sql: SqlClient.SqlClient): sql is PgClient.PgClient => PgClient.TypeId in sql

const LibsqlResults = Schema.Struct({ rowsAffected: Schema.Number })

const PgResults = Schema.Struct({
  rowsAffected: Schema.propertySignature(Schema.Number).pipe(Schema.fromKey('rowCount')),
})

const SqlQueryResults = Schema.Union(LibsqlResults, PgResults)
