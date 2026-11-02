import { SqlClient, type SqlError, type Statement } from 'effect/sql'
import { PgClient } from '@effect/sql-pg'
import {
  Array,
  Context,
  Data,
  Effect,
  Layer,
  Option,
  pipe,
  PubSub,
  Record,
  Schema,
  Scope,
  Struct,
  SchemaIssue,
  SchemaGetter,
} from 'effect'
import * as EventStore from './EventStore.ts'
import * as Events from './Events.ts'
import type * as SensitiveDataStore from './SensitiveDataStore.ts'
import { Uuid } from './types/index.ts'

class UnexpectedEventFound extends Data.TaggedError('UnexpectedEventFound') {}

export const make: Effect.Effect<
  EventStore.EventStore,
  SqlError.SqlError,
  Events.Events | SqlClient.SqlClient | Uuid.GenerateUuid | SensitiveDataStore.SensitiveDataStore
> = Effect.gen(function* () {
  const context = yield* Effect.map(Effect.context<SensitiveDataStore.SensitiveDataStore>(), Context.omit(Scope.Scope))

  const sql = yield* SqlClient.SqlClient
  const generateUuid = (yield* Uuid.GenerateUuid).v4()
  const events = yield* Events.Events

  yield* sql.onDialectOrElse({
    pg: () => sql`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT NOT NULL PRIMARY KEY,
        type TEXT NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc'),
        payload JSONB NOT NULL,
        position SERIAL,
        UNIQUE (position)
      )
    `,
    orElse: () => sql`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT NOT NULL,
        type TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        payload JSONB NOT NULL,
        position INTEGER PRIMARY KEY AUTOINCREMENT
      )
    `,
  })

  yield* sql.onDialectOrElse({
    pg: () =>
      Effect.all([
        sql`CREATE INDEX IF NOT EXISTS idx_events_type ON events (type)`,
        sql`CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events (timestamp)`,
        sql`CREATE INDEX IF NOT EXISTS idx_events_payload_gin ON events USING gin (payload)`,
      ]),
    orElse: () => Effect.void,
  })

  const buildFilterCondition = (filter: Events.EventFilter) =>
    sql.or(
      Array.map(Array.ensure(filter), filter => {
        if (!filter.predicates || Struct.keys(filter.predicates).length === 0) {
          return sql.in('type', filter.types)
        }

        const predicateEncoder = Schema.Struct<Schema.Struct.Fields>(
          Struct.pick(
            Option.getOrThrow(
              Array.findFirst(Events.Event.members, member => Array.contains(filter.types, member.identifier)),
            ).fields as never,
            Record.keys(filter.predicates) as never,
          ),
        )

        const encodedPredicates = Schema.encodeSync(predicateEncoder as unknown as Schema.Codec<unknown, unknown>)(
          filter.predicates,
        ) as Record.ReadonlyRecord<string, string | number>

        return sql.and([
          sql.in('type', filter.types),
          ...sql.onDialectOrElse({
            pg: () => [
              sql`payload @> ${isPgClient(sql) ? sql.json(encodedPredicates) : JSON.stringify(encodedPredicates)}`,
            ],
            orElse: () =>
              Record.reduce(encodedPredicates, Array.empty<Statement.Fragment>(), (conditions, value, key) =>
                typeof value === 'string' ? Array.append(conditions, sql`payload ->> ${key} = ${value}`) : conditions,
              ),
          }),
        ])
      }),
    )

  const selectEventRows = <F extends Events.EventFilter>(filter: F) =>
    pipe(
      sql`
        SELECT
          id,
          type,
          payload,
          position
        FROM
          events
        WHERE
          ${buildFilterCondition(filter)}
        ORDER BY
          position ASC
      `,
      Effect.andThen(Schema.decodeUnknownEffect(Schema.Array(EventsTableSelect), { concurrency: 'unbounded' })),
      Effect.filterOrElse(
        Array.every(
          (
            result,
          ): result is {
            readonly id: Uuid.Uuid
            readonly position: EventStore.Position
            readonly event: Events.EventsForFilter<F>
          } => Events.matches(result.event, filter),
        ),
        () => new UnexpectedEventFound(),
      ),
      Effect.tapError(error => Effect.annotateLogs(Effect.logError('Unable to filter events'), { error, filter })),
      Effect.mapError(error => new EventStore.FailedToGetEvents({ cause: error })),
    )

  const all: EventStore.EventStore['all'] = pipe(
    sql`
      SELECT
        id,
        type,
        payload,
        position
      FROM
        events
      ORDER BY
        position ASC
    `,
    Effect.andThen(Schema.decodeUnknownEffect(Schema.Array(EventsTableSelect), { concurrency: 'unbounded' })),
    Effect.andThen(
      Array.match({
        onEmpty: () => Effect.succeedNone,
        onNonEmpty: rows =>
          Effect.succeedSome({
            events: Array.map(rows, Struct.get('event')),
            lastKnownPosition: Array.lastNonEmpty(rows).position,
          }),
      }),
    ),
    Effect.tapError(error =>
      Effect.annotateLogs(Effect.logError('Unable to get all events'), {
        error,
      }),
    ),
    Effect.mapError(error => new EventStore.FailedToGetEvents({ cause: error })),
    Effect.provide(context),
    Effect.withSpan('SqlEventStore.all'),
  )

  const since: EventStore.EventStore['since'] = Effect.fn('SqlEventStore.since')(
    function* (lastKnownPosition) {
      const rows = yield* pipe(
        sql`
          SELECT
            id,
            type,
            payload,
            position
          FROM
            events
          WHERE
            position > ${lastKnownPosition}
          ORDER BY
            position ASC
        `,
        Effect.andThen(Schema.decodeUnknownEffect(Schema.Array(EventsTableSelect), { concurrency: 'unbounded' })),
      )

      return yield* Array.match(rows, {
        onEmpty: () => Effect.succeedNone,
        onNonEmpty: rows =>
          Effect.succeedSome({
            events: Array.map(rows, Struct.get('event')),
            lastKnownPosition: Array.lastNonEmpty(rows).position,
          }),
      })
    },
    Effect.tapError(error =>
      Effect.annotateLogs(Effect.logError('Unable to get events'), {
        error,
      }),
    ),
    Effect.mapError(error => new EventStore.FailedToGetEvents({ cause: error })),
    Effect.provide(context),
  )

  const query: EventStore.EventStore['query'] = Effect.fn('SqlEventStore.query')(function* (filter) {
    const rows = yield* selectEventRows(filter)

    return Array.match(rows, {
      onEmpty: Option.none,
      onNonEmpty: rows =>
        Option.some({
          events: Array.map(rows, Struct.get('event')),
          lastKnownPosition: Array.lastNonEmpty(rows).position,
        }),
    })
  }, Effect.provide(context))

  const append: EventStore.EventStore['append'] = Effect.fn('SqlEventStore.append')(
    function* (event) {
      const id = yield* generateUuid

      const encoded = yield* Schema.encodeEffect(EventsTableInsert)({
        id,
        event,
      })

      return yield* pipe(
        sql`
          INSERT INTO
            events (id, type, payload)
          SELECT
            ${encoded.id},
            ${encoded.type},
            ${isPgClient(sql) ? sql.json(encoded.payload) : sql`${JSON.stringify(encoded.payload)}`}
        `.raw,
        Effect.andThen(Schema.decodeUnknownEffect(SqlQueryResults)),
      )
    },
    Effect.tapError(error => Effect.annotateLogs(Effect.logError('Unable to commit events'), { error })),
    Effect.catchTag(['SqlError', 'SchemaError'], error => new EventStore.FailedToCommitEvent({ cause: error })),
    Effect.provide(context),
  )

  const appendIf: EventStore.EventStore['appendIf'] = Effect.fn('SqlEventStore.appendIf')(
    function* (event, appendCondition) {
      const id = yield* generateUuid

      const encoded = yield* Schema.encodeEffect(EventsTableInsert)({
        id,
        event,
      })

      const condition = Option.match(appendCondition.lastKnownPosition, {
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
        onSome: lastKnownPosition => sql`
          (
            SELECT
              position
            FROM
              events
            WHERE
              ${buildFilterCondition(appendCondition.filter)}
            ORDER BY
              position DESC
            LIMIT
              1
          ) = ${lastKnownPosition}
        `,
      })

      const results = yield* pipe(
        sql`
          INSERT INTO
            events (id, type, payload)
          SELECT
            ${encoded.id},
            ${encoded.type},
            ${isPgClient(sql) ? sql.json(encoded.payload) : sql`${JSON.stringify(encoded.payload)}`}
          WHERE
            (${condition})
        `.raw,
        Effect.andThen(Schema.decodeUnknownEffect(SqlQueryResults)),
      )
      if (results.rowsAffected !== 1) {
        return yield* new EventStore.NewEventsFound()
      }

      yield* PubSub.publish(events, event)
    },
    Effect.tapError(error => Effect.annotateLogs(Effect.logError('Unable to commit events'), { error })),
    Effect.catchTag(['SqlError', 'SchemaError'], error => new EventStore.FailedToCommitEvent({ cause: error })),
    Effect.provide(context),
  )

  return { all, since, query, append, appendIf }
})

export const layer = Layer.effect(EventStore.EventStore, make)

const EventsTableInsert = Schema.Struct({
  id: Uuid.UuidSchema,
  type: Schema.String,
  payload: Schema.Union([
    Schema.Record(Schema.String, Schema.Unknown),
    Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown)),
  ]),
}).pipe(
  Schema.decodeTo(
    Schema.toType(
      Schema.Struct({
        id: Uuid.UuidSchema,
        event: Events.Event,
      }),
    ),
    {
      decode: SchemaGetter.transformEffect(value =>
        Effect.fail(
          new SchemaIssue.Forbidden({ message: 'Not allowed to decode when using Insert statements' }, value),
        ),
      ),
      encode: SchemaGetter.transformEffect(({ event, ...rest }) =>
        Effect.gen(function* () {
          const { _tag, ...payload } = yield* Schema.encodeUnknownEffect(Events.Event)(event).pipe(
            Effect.mapError(error => error.issue),
          )

          return { ...rest, type: _tag, payload }
        }),
      ),
    },
  ),
)

const EventsTableSelect = Schema.Struct({
  id: Uuid.UuidSchema,
  position: EventStore.Position,
  type: Schema.String,
  payload: Schema.Union([
    Schema.Record(Schema.String, Schema.Unknown),
    Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown)),
  ]),
}).pipe(
  Schema.decodeTo(
    Schema.toType(
      Schema.Struct({
        id: Uuid.UuidSchema,
        position: EventStore.Position,
        event: Events.Event,
      }),
    ),
    {
      decode: SchemaGetter.transformEffect(({ type, payload, ...rest }) =>
        Effect.gen(function* () {
          const event = yield* Schema.decodeUnknownEffect(Events.Event)({ _tag: type, ...payload }).pipe(
            Effect.mapError(error => error.issue),
          )

          return { ...rest, event }
        }),
      ),
      encode: SchemaGetter.transformEffect(value =>
        Effect.fail(
          new SchemaIssue.Forbidden({ message: 'Not allowed to encode when using Select statements' }, value),
        ),
      ),
    },
  ),
)

const isPgClient = (sql: SqlClient.SqlClient): sql is PgClient.PgClient => PgClient.TypeId in sql

const LibsqlResults = Schema.Struct({ rowsAffected: Schema.Number })

const PgResults = Schema.Struct({ rowsAffected: Schema.Number }).pipe(Schema.encodeKeys({ rowsAffected: 'rowCount' }))

const SqlQueryResults = Schema.Union([LibsqlResults, PgResults])
