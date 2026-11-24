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
  SchemaGetter,
  SchemaIssue,
  Scope,
  Stream,
  Struct,
  Tuple,
  UndefinedOr,
} from 'effect'
import { SqlClient, type SqlError, type Statement } from 'effect/sql'
import * as EventStore from './EventStore.ts'
import * as Events from './Events.ts'
import type * as SensitiveDataStore from './SensitiveDataStore.ts'
import { Uuid } from './types/index.ts'

class UnexpectedEventFound extends Data.TaggedError('UnexpectedEventFound') {}

export const PageSize = Context.Reference<number>('SqlEventStore/PageSize', { defaultValue: () => 5000 })

export const make: Effect.Effect<
  EventStore.EventStore,
  SqlError.SqlError,
  Events.Events | SqlClient.SqlClient | Uuid.GenerateUuid | SensitiveDataStore.SensitiveDataStore
> = Effect.gen(function* () {
  const context = yield* Effect.map(Effect.context<SensitiveDataStore.SensitiveDataStore>(), Context.omit(Scope.Scope))

  const sql = yield* SqlClient.SqlClient
  const pageSize = yield* PageSize
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
        transaction_id XID8 NOT NULL DEFAULT pg_current_xact_id(),
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
      Effect.gen(function* () {
        const transactionIdColumn = yield* sql`
          SELECT
            1
          FROM
            information_schema.columns
          WHERE
            table_schema = current_schema()
            AND table_name = 'events'
            AND column_name = 'transaction_id'
        `

        if (Array.isReadonlyArrayNonEmpty(transactionIdColumn)) {
          return
        }

        yield* sql.withTransaction(
          Effect.all([
            sql`
              ALTER TABLE events
              ADD COLUMN IF NOT EXISTS transaction_id XID8 NOT NULL DEFAULT '0'
            `,
            sql`
              ALTER TABLE events
              ALTER COLUMN transaction_id
              SET DEFAULT pg_current_xact_id()
            `,
          ]),
        )
      }),
    orElse: () => Effect.void,
  })

  yield* sql.onDialectOrElse({
    pg: () =>
      Effect.all([
        sql`CREATE INDEX IF NOT EXISTS idx_events_transaction_id_position ON events (transaction_id, position)`,
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

  const decodePage = Effect.fn('SqlEventStore.decodePage')(function* (rows: Array.NonEmptyReadonlyArray<unknown>) {
    const decoded = yield* Schema.decodeUnknownEffect(Schema.NonEmptyArray(EventsTableSelect), {
      concurrency: 'unbounded',
    })(rows)
    const lastRow = yield* Schema.decodeUnknownEffect(CursorRow)(Array.lastNonEmpty(rows))

    return {
      events: Array.map(decoded, Struct.get('event')),
      cursor: makeCursor(lastRow.transactionId ?? BigInt(0), lastRow.position),
    } satisfies EventStore.Page
  }, Effect.provide(context))

  const matching: (filter?: Events.EventFilter) => ReadonlyArray<Statement.Fragment> = UndefinedOr.match({
    onUndefined: Array.empty,
    onDefined: filter => Array.of(buildFilterCondition(filter)),
  })

  const getPageAfter = Effect.fn('SqlEventStore.getPageAfter')(
    function* (cursor: EventStore.Cursor, filter?: Events.EventFilter) {
      const after = yield* readCursor(cursor)

      yield* Effect.annotateCurrentSpan({ after: after.position })

      const rows = yield* sql`
        SELECT
          id,
          type,
          payload,
          position
        FROM
          events
        WHERE
          ${sql.and([sql`position > ${after.position}`, ...matching(filter)])}
        ORDER BY
          position ASC
        LIMIT
          ${pageSize}
      `

      if (!Array.isReadonlyArrayNonEmpty(rows)) {
        return Option.none()
      }

      const page = yield* decodePage(rows)

      return Option.some({ page, isLastPage: rows.length < pageSize })
    },
    Effect.tapError(error =>
      Effect.annotateLogs(Effect.logError('Unable to get events'), {
        error,
      }),
    ),
    Effect.mapError(error => new EventStore.FailedToGetEvents({ cause: error })),
  )

  const getNextPageAfter: (
    after: EventStore.Cursor,
    filter?: Events.EventFilter,
  ) => Effect.Effect<
    readonly [ReadonlyArray<EventStore.Page>, Option.Option<EventStore.Cursor>],
    EventStore.FailedToGetEvents
  > = Effect.fnUntraced(function* (after, filter) {
    const result = yield* getPageAfter(after, filter)

    if (Option.isNone(result)) {
      return Tuple.make([], Option.none())
    }

    const { page, isLastPage } = result.value

    return Tuple.make([page], isLastPage ? Option.none() : Option.some(page.cursor))
  })

  const streamAfter = (
    cursor: EventStore.Cursor,
    filter?: Events.EventFilter,
  ): Stream.Stream<EventStore.Page, EventStore.FailedToGetEvents> =>
    sql.onDialectOrElse({
      pg: () =>
        pipe(
          readCursor(cursor),
          Effect.map(
            after => sql`
              SELECT
                id,
                type,
                payload,
                position,
                transaction_id::TEXT
              FROM
                events
              WHERE
                ${sql.and([
                  sql`
                    (transaction_id, position) > (
                      ${after.transactionId.toString()}::XID8,
                      ${after.position}
                    )
                  `,
                  sql`transaction_id < pg_snapshot_xmin(pg_current_snapshot())`,
                  ...matching(filter),
                ])}
              ORDER BY
                events.transaction_id ASC,
                events.position ASC
            `.stream,
          ),
          Stream.unwrap,
          Stream.grouped(pageSize),
          Stream.mapEffect(decodePage),
          Stream.tapError(error =>
            Effect.annotateLogs(Effect.logError('Unable to get events'), {
              error,
            }),
          ),
          Stream.mapError(error => new EventStore.FailedToGetEvents({ cause: error })),
        ),
      orElse: () => Stream.paginate(cursor, cursor => getNextPageAfter(cursor, filter)),
    })

  const all: EventStore.EventStore['all'] = streamAfter(makeCursor(BigInt(0), EventStore.Position.make(0)))

  const since: EventStore.EventStore['since'] = streamAfter

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

const CursorRow = Schema.Struct({
  position: EventStore.Position,
  transactionId: Schema.optionalKey(Schema.BigIntFromString),
}).pipe(Schema.encodeKeys({ transactionId: 'transaction_id' }))

const CursorParts = Schema.TemplateLiteralParser([Schema.BigInt, ':', EventStore.Position])

const makeCursor = (transactionId: bigint, position: EventStore.Position) =>
  EventStore.Cursor.make(Schema.encodeSync(CursorParts)([transactionId, ':', position]))

const readCursor = (cursor: EventStore.Cursor) =>
  Effect.map(Schema.decodeUnknownEffect(CursorParts)(cursor), ([transactionId, , position]) => ({
    transactionId,
    position,
  }))
