import { PgClient } from '@effect/sql-pg'
import {
  Array,
  Context,
  Data,
  Effect,
  flow,
  Layer,
  Option,
  Order,
  pipe,
  PubSub,
  Record,
  Ref,
  Schedule,
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
  Events.Events | SqlClient.SqlClient | Uuid.GenerateUuid | SensitiveDataStore.SensitiveDataStore | Scope.Scope
> = Effect.gen(function* () {
  const context = yield* Effect.map(Effect.context<SensitiveDataStore.SensitiveDataStore>(), Context.omit(Scope.Scope))

  const sql = yield* SqlClient.SqlClient
  const pageSize = yield* PageSize
  const generateUuid = (yield* Uuid.GenerateUuid).v4()
  const events = yield* Events.Events
  const changes = yield* PubSub.unbounded<true>()

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
    const cursors = yield* Schema.decodeUnknownEffect(Schema.NonEmptyArray(CursorRow))(rows)

    return Array.zipWith(decoded, cursors, ({ event }, { transactionId, position }) => ({
      event,
      cursor: makeCursor(transactionId ?? BigInt(0), position),
    })) satisfies EventStore.Page
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

    return Tuple.make([page], isLastPage ? Option.none() : Option.some(Array.lastNonEmpty(page).cursor))
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

  const all: EventStore.EventStore['all'] = streamAfter(beginning)

  const since: EventStore.EventStore['since'] = streamAfter

  const latestCursor: EventStore.EventStore['latestCursor'] = pipe(
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

  const loadCheckpoint: EventStore.EventStore['loadCheckpoint'] = Effect.fn('SqlEventStore.loadCheckpoint')(
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

  const saveCheckpoint: EventStore.EventStore['saveCheckpoint'] = Effect.fn('SqlEventStore.saveCheckpoint')(
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

  const lockEventTypes = (types: ReadonlyArray<Events.Event['_tag']>) =>
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

  const append: EventStore.EventStore['append'] = Effect.fn('SqlEventStore.append')(
    function* (event) {
      const id = yield* generateUuid

      const encoded = yield* Schema.encodeEffect(EventsTableInsert)({
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

      yield* PubSub.publish(events, event)
      yield* PubSub.publish(changes, true)
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

      yield* PubSub.publish(events, event)
      yield* PubSub.publish(changes, true)
    },
    Effect.tapError(error => Effect.annotateLogs(Effect.logError('Unable to commit events'), { error })),
    Effect.catchTag(['SqlError', 'SchemaError'], error => new EventStore.FailedToCommitEvent({ cause: error })),
    Effect.provide(context),
  )

  const lastSeenCursor = yield* Ref.make(Option.none<EventStore.Cursor>())

  yield* pipe(
    Effect.gen(function* () {
      const cursor = yield* latestCursor
      const previousCursor = yield* Ref.getAndSet(lastSeenCursor, Option.some(cursor))

      if (Option.contains(previousCursor, cursor)) {
        return
      }

      yield* PubSub.publish(changes, true)
    }),
    Effect.ignore,
    Effect.withTracerEnabled(false),
    Effect.repeat(Schedule.spaced('500 millis')),
    Effect.forkScoped,
  )

  const subscribe: EventStore.EventStore['subscribe'] = ({ after = beginning, filter } = {}) =>
    Stream.unwrap(
      Effect.gen(function* () {
        const changed = yield* PubSub.subscribe(changes)
        const lastCursor = yield* Ref.make(after)

        const readNewPages = Stream.unwrap(
          Effect.map(Ref.get(lastCursor), cursor =>
            Stream.tap(streamAfter(cursor, filter), page => Ref.set(lastCursor, Array.lastNonEmpty(page).cursor)),
          ),
        )

        return Stream.concat(
          readNewPages,
          pipe(
            Stream.fromEffectRepeat(PubSub.takeAll(changed)),
            Stream.flatMap(() => readNewPages),
          ),
        )
      }),
    )

  return { all, since, subscribe, latestCursor, loadCheckpoint, saveCheckpoint, query, append, appendIf }
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

const beginning = makeCursor(BigInt(0), EventStore.Position.make(0))

const readCursor = (cursor: EventStore.Cursor) =>
  Effect.map(Schema.decodeUnknownEffect(CursorParts)(cursor), ([transactionId, , position]) => ({
    transactionId,
    position,
  }))
