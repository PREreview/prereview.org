import { PgClient } from '@effect/sql-pg'
import {
  Array,
  Context,
  Data,
  Effect,
  flow,
  Option,
  Order,
  pipe,
  Record,
  Ref,
  Schedule,
  Schema,
  SchemaGetter,
  SchemaIssue,
  Scope,
  Stream,
  Struct,
  SubscriptionRef,
  Tuple,
  UndefinedOr,
} from 'effect'
import { SqlClient, type SqlError, type Statement } from 'effect/sql'
import { Uuid } from '../types/index.ts'
import * as EventFilter from './EventFilter.ts'
import * as EventStore from './EventStore.ts'

class UnexpectedEventFound extends Data.TaggedError('UnexpectedEventFound') {}

export const PageSize = Context.Reference<number>('SqlEventStore/PageSize', { defaultValue: () => 5000 })

export type EventSchema<E extends EventFilter.AnyEvent, RD, RE> = EventFilter.EventSchema<E> &
  Schema.Codec<E, { readonly _tag: string }, RD, RE>

export const make: <E extends EventFilter.AnyEvent, RD, RE>(
  schema: EventSchema<E, RD, RE>,
) => Effect.Effect<
  EventStore.EventStore<E>,
  SqlError.SqlError,
  SqlClient.SqlClient | Uuid.GenerateUuid | RD | RE | Scope.Scope
> = Effect.fnUntraced(function* <E extends EventFilter.AnyEvent, RD, RE>(schema: EventSchema<E, RD, RE>) {
  const context = yield* Effect.map(Effect.context<RD | RE>(), Context.omit(Scope.Scope))
  const provideSchemaServices = <A, Err>(effect: Effect.Effect<A, Err, RD | RE>) =>
    Effect.provide(effect, context) as Effect.Effect<A, Err>

  const sql = yield* SqlClient.SqlClient
  const pageSize = yield* PageSize
  const generateUuid = (yield* Uuid.GenerateUuid).v4()
  const version = yield* SubscriptionRef.make(0)
  const eventsTableInsert = EventsTableInsert(schema)
  const eventsTableSelect = EventsTableSelect(schema)
  const matches = EventFilter.matches(schema)

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
    pg: () => sql`
      CREATE TABLE IF NOT EXISTS event_checkpoints (
        name TEXT NOT NULL PRIMARY KEY,
        transaction_id XID8 NOT NULL,
        position INTEGER NOT NULL
      )
    `,
    orElse: () => sql`
      CREATE TABLE IF NOT EXISTS event_checkpoints (
        name TEXT NOT NULL PRIMARY KEY,
        position INTEGER NOT NULL
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

  const buildFilterCondition = (filter: EventFilter.EventFilter<E>) =>
    sql.or(
      Array.map(Array.ensure(filter), filter => {
        if (!filter.predicates || Struct.keys(filter.predicates).length === 0) {
          return sql.in('type', filter.types)
        }

        const predicateEncoder = Schema.Struct<Schema.Struct.Fields>(
          Struct.pick(
            Option.getOrThrow(
              Array.findFirst(schema.members, member => Array.contains(filter.types, member.identifier)),
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
              Array.map(Record.toEntries(encodedPredicates), ([key, value]) => sql`payload ->> ${key} = ${value}`),
          }),
        ])
      }),
    )

  const selectEventRows = <F extends EventFilter.EventFilter<E>>(filter: F) =>
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
      Effect.andThen(Schema.decodeUnknownEffect(Schema.Array(eventsTableSelect), { concurrency: 'unbounded' })),
      Effect.filterOrElse(
        Array.every(
          (
            result,
          ): result is {
            readonly id: Uuid.Uuid
            readonly position: EventStore.Position
            readonly event: EventFilter.EventsForFilter<E, F>
          } => matches(result.event, filter),
        ),
        () => new UnexpectedEventFound(),
      ),
      Effect.tapError(error => Effect.annotateLogs(Effect.logError('Unable to filter events'), { error, filter })),
      Effect.mapError(error => new EventStore.FailedToGetEvents({ cause: error })),
    )

  const decodePage = Effect.fn('SqlEventStore.decodePage')(function* (rows: Array.NonEmptyReadonlyArray<unknown>) {
    const decoded = yield* Schema.decodeUnknownEffect(Schema.NonEmptyArray(eventsTableSelect), {
      concurrency: 'unbounded',
    })(rows)
    const cursors = yield* Schema.decodeUnknownEffect(Schema.NonEmptyArray(CursorRow))(rows)

    return Array.zipWith(decoded, cursors, ({ event }, { transactionId, position }) => ({
      event,
      cursor: makeCursor(transactionId ?? BigInt(0), position),
    })) satisfies EventStore.Page<E>
  }, provideSchemaServices)

  const matching: (filter?: EventFilter.EventFilter<E>) => ReadonlyArray<Statement.Fragment> = UndefinedOr.match({
    onUndefined: Array.empty,
    onDefined: filter => Array.of(buildFilterCondition(filter)),
  })

  const getPageAfter = Effect.fn('SqlEventStore.getPageAfter')(
    function* (cursor: EventStore.Cursor, filter?: EventFilter.EventFilter<E>) {
      const after = yield* readCursor(cursor)

      yield* Effect.annotateCurrentSpan({ after: after.position })

      const rows = yield* sql.onDialectOrElse({
        pg: () => sql`
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
          LIMIT
            ${pageSize}
        `,
        orElse: () => sql`
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
        `,
      })

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
    filter?: EventFilter.EventFilter<E>,
  ) => Effect.Effect<
    readonly [ReadonlyArray<EventStore.Page<E>>, Option.Option<EventStore.Cursor>],
    EventStore.FailedToGetEvents
  > = Effect.fnUntraced(function* (after, filter) {
    const result = yield* getPageAfter(after, filter)

    if (Option.isNone(result)) {
      return Tuple.make([], Option.none())
    }

    const { page, isLastPage } = result.value

    return Tuple.make([page], isLastPage ? Option.none() : Option.some(Array.lastNonEmpty(page).cursor))
  })

  const streamAfter = (
    cursor: EventStore.Cursor,
    filter?: EventFilter.EventFilter<E>,
  ): Stream.Stream<EventStore.Page<E>, EventStore.FailedToGetEvents> =>
    Stream.paginate(cursor, cursor => getNextPageAfter(cursor, filter))

  const all: EventStore.EventStore<E>['all'] = streamAfter(beginning)

  const since: EventStore.EventStore<E>['since'] = streamAfter

  const latestCursor: EventStore.EventStore<E>['latestCursor'] = pipe(
    sql.onDialectOrElse({
      pg: () => sql`
        SELECT
          position,
          transaction_id::TEXT
        FROM
          events
        WHERE
          transaction_id < pg_snapshot_xmin(pg_current_snapshot())
        ORDER BY
          events.transaction_id DESC,
          events.position DESC
        LIMIT
          1
      `,
      orElse: () => sql`
        SELECT
          position
        FROM
          events
        ORDER BY
          position DESC
        LIMIT
          1
      `,
    }),
    Effect.andThen(Schema.decodeUnknownEffect(Schema.Array(CursorRow))),
    Effect.map(
      flow(
        Array.head,
        Option.match({
          onNone: () => beginning,
          onSome: row => makeCursor(row.transactionId ?? BigInt(0), row.position),
        }),
      ),
    ),
    Effect.tapError(error => Effect.annotateLogs(Effect.logError('Unable to get the latest cursor'), { error })),
    Effect.mapError(error => new EventStore.FailedToGetEvents({ cause: error })),
    Effect.withSpan('SqlEventStore.latestCursor'),
  )

  const loadCheckpoint: EventStore.EventStore<E>['loadCheckpoint'] = Effect.fn('SqlEventStore.loadCheckpoint')(
    function* (name) {
      const rows = yield* sql.onDialectOrElse({
        pg: () => sql`
          SELECT
            position,
            transaction_id::TEXT
          FROM
            event_checkpoints
          WHERE
            name = ${name}
        `,
        orElse: () => sql`
          SELECT
            position
          FROM
            event_checkpoints
          WHERE
            name = ${name}
        `,
      })

      const decoded = yield* Schema.decodeUnknownEffect(Schema.Array(CursorRow))(rows)

      return Option.map(Array.head(decoded), row => makeCursor(row.transactionId ?? BigInt(0), row.position))
    },
    Effect.tapError(error => Effect.annotateLogs(Effect.logError('Unable to load a checkpoint'), { error })),
    Effect.mapError(error => new EventStore.FailedToLoadCheckpoint({ cause: error })),
  )

  const saveCheckpoint: EventStore.EventStore<E>['saveCheckpoint'] = Effect.fn('SqlEventStore.saveCheckpoint')(
    function* (name, cursor) {
      const { transactionId, position } = yield* readCursor(cursor)

      yield* sql.onDialectOrElse({
        pg: () => sql`
          INSERT INTO
            event_checkpoints (name, transaction_id, position)
          VALUES
            (
              ${name},
              ${transactionId.toString()}::XID8,
              ${position}
            )
          ON CONFLICT (name) DO UPDATE
          SET
            transaction_id = excluded.transaction_id,
            position = excluded.position
          WHERE
            (
              event_checkpoints.transaction_id,
              event_checkpoints.position
            ) < (excluded.transaction_id, excluded.position)
        `,
        orElse: () => sql`
          INSERT INTO
            event_checkpoints (name, position)
          VALUES
            (
              ${name},
              ${position}
            )
          ON CONFLICT (name) DO UPDATE
          SET
            position = excluded.position
          WHERE
            event_checkpoints.position < excluded.position
        `,
      })
    },
    Effect.tapError(error => Effect.annotateLogs(Effect.logError('Unable to save a checkpoint'), { error })),
    Effect.mapError(error => new EventStore.FailedToSaveCheckpoint({ cause: error })),
  )

  const query: EventStore.EventStore<E>['query'] = Effect.fn('SqlEventStore.query')(function* (filter) {
    const rows = yield* selectEventRows(filter)

    return Array.match(rows, {
      onEmpty: Option.none,
      onNonEmpty: rows =>
        Option.some({
          events: Array.map(rows, Struct.get('event')),
          lastKnownPosition: Array.lastNonEmpty(rows).position,
        }),
    })
  }, provideSchemaServices)

  const lockEventTypes = (types: ReadonlyArray<E['_tag']>) =>
    sql.onDialectOrElse({
      pg: () =>
        Effect.forEach(
          Array.sort(Array.dedupe(types), Order.String),
          type => sql`
            SELECT
              pg_advisory_xact_lock(
                hashtextextended (${`events:${type}`}, 0)
              )
          `,
          { discard: true },
        ),
      orElse: () => Effect.void,
    })

  const append: EventStore.EventStore<E>['append'] = Effect.fn('SqlEventStore.append')(
    function* (event) {
      const id = yield* generateUuid

      const encoded = yield* Schema.encodeEffect(eventsTableInsert)({
        id,
        event,
      })

      yield* pipe(
        lockEventTypes([event._tag]),
        Effect.andThen(sql`
          INSERT INTO
            events (id, type, payload)
          SELECT
            ${encoded.id},
            ${encoded.type},
            ${isPgClient(sql) ? sql.json(encoded.payload) : sql`${JSON.stringify(encoded.payload)}`}
        `.raw),
        Effect.andThen(Schema.decodeUnknownEffect(SqlQueryResults)),
        sql.withTransaction,
      )

      yield* SubscriptionRef.update(version, n => n + 1)
    },
    Effect.tapError(error => Effect.annotateLogs(Effect.logError('Unable to commit events'), { error })),
    Effect.catchTag(['SqlError', 'SchemaError'], error => new EventStore.FailedToCommitEvent({ cause: error })),
    provideSchemaServices,
  )

  const appendIf: EventStore.EventStore<E>['appendIf'] = Effect.fn('SqlEventStore.appendIf')(
    function* (event, appendCondition) {
      const id = yield* generateUuid

      const encoded = yield* Schema.encodeEffect(eventsTableInsert)({
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
        lockEventTypes([event._tag, ...Array.flatMap(Array.ensure(appendCondition.filter), Struct.get('types'))]),
        Effect.andThen(sql`
          INSERT INTO
            events (id, type, payload)
          SELECT
            ${encoded.id},
            ${encoded.type},
            ${isPgClient(sql) ? sql.json(encoded.payload) : sql`${JSON.stringify(encoded.payload)}`}
          WHERE
            (${condition})
        `.raw),
        Effect.andThen(Schema.decodeUnknownEffect(SqlQueryResults)),
        sql.withTransaction,
      )
      if (results.rowsAffected !== 1) {
        return yield* new EventStore.NewEventsFound()
      }

      yield* SubscriptionRef.update(version, n => n + 1)
    },
    Effect.tapError(error => Effect.annotateLogs(Effect.logError('Unable to commit events'), { error })),
    Effect.catchTag(['SqlError', 'SchemaError'], error => new EventStore.FailedToCommitEvent({ cause: error })),
    provideSchemaServices,
  )

  const lastSeenCursor = yield* Ref.make(Option.none<EventStore.Cursor>())

  yield* pipe(
    Effect.gen(function* () {
      const cursor = yield* latestCursor
      const previousCursor = yield* Ref.getAndSet(lastSeenCursor, Option.some(cursor))

      if (Option.contains(previousCursor, cursor)) {
        return
      }

      yield* SubscriptionRef.update(version, n => n + 1)
    }),
    Effect.ignore,
    Effect.withTracerEnabled(false),
    Effect.repeat(Schedule.spaced('500 millis')),
    Effect.forkScoped,
  )

  const subscribe: EventStore.EventStore<E>['subscribe'] = ({ after = beginning, filter } = {}) =>
    Stream.unwrap(
      Effect.gen(function* () {
        const lastCursor = yield* Ref.make(after)

        const readNewPages = Stream.unwrap(
          Effect.map(Ref.get(lastCursor), cursor =>
            Stream.tap(streamAfter(cursor, filter), page => Ref.set(lastCursor, Array.lastNonEmpty(page).cursor)),
          ),
        )

        return pipe(
          SubscriptionRef.changes(version),
          Stream.buffer({ capacity: 1, strategy: 'sliding' }),
          Stream.flatMap(() => readNewPages),
        )
      }),
    )

  return { all, since, subscribe, latestCursor, loadCheckpoint, saveCheckpoint, query, append, appendIf }
})

const EventsTableInsert = <E extends EventFilter.AnyEvent, RD, RE>(schema: EventSchema<E, RD, RE>) =>
  Schema.Struct({
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
          event: schema,
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
            const { _tag, ...payload } = yield* Schema.encodeUnknownEffect(schema)(event).pipe(
              Effect.mapError(error => error.issue),
            )

            return { ...rest, type: _tag, payload }
          }),
        ),
      },
    ),
  )

const EventsTableSelect = <E extends EventFilter.AnyEvent, RD, RE>(schema: EventSchema<E, RD, RE>) =>
  Schema.Struct({
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
          event: schema,
        }),
      ),
      {
        decode: SchemaGetter.transformEffect(({ type, payload, ...rest }) =>
          Effect.gen(function* () {
            const event = yield* Schema.decodeUnknownEffect(schema)({ _tag: type, ...payload }).pipe(
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

const isPgClient = (sql: SqlClient.SqlClient): sql is PgClient.PgClient & SqlClient.SqlClient => PgClient.TypeId in sql

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

const beginning = makeCursor(BigInt(0), EventStore.Position.make(0))

const readCursor = (cursor: EventStore.Cursor) =>
  Effect.map(Schema.decodeUnknownEffect(CursorParts)(cursor), ([transactionId, , position]) => ({
    transactionId,
    position,
  }))
