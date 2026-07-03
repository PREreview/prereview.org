/* eslint-disable import/no-internal-modules */
import { SqlClient } from '@effect/sql'
import { LibsqlClient } from '@effect/sql-libsql'
import { Console, Effect, Layer, ParseResult, Schema, pipe } from 'effect'
import path from 'path'
import { Event } from '../src/Events.ts'
import * as SensitiveDataStore from '../src/SensitiveDataStore.ts'

const SensitiveDataStoreStub = Layer.succeed(SensitiveDataStore.SensitiveDataStore, {
  get: () => Effect.succeedNone,
  getMany: () => Effect.succeed({}),
  add: () => Effect.die('not implemented'),
})

const EventRow = Schema.transformOrFail(
  Schema.Struct({
    position: Schema.Number,
    type: Schema.String,
    payload: Schema.Union(
      Schema.Record({ key: Schema.String, value: Schema.Unknown }),
      Schema.parseJson(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
    ),
  }),
  Schema.typeSchema(
    Schema.Struct({
      position: Schema.Number,
      event: Event,
    }),
  ),
  {
    strict: true,
    decode: ({ type, payload, ...rest }) =>
      Effect.gen(function* () {
        const event = yield* ParseResult.decodeUnknown(Event)({ _tag: type, ...payload })
        return { ...rest, event }
      }),
    encode: (value, _, ast) => ParseResult.fail(new ParseResult.Forbidden(ast, value)),
  },
)

const program = pipe(
  SqlClient.SqlClient,
  Effect.andThen(
    sql => sql`
      SELECT
        type,
        payload,
        position
      FROM
        events
      ORDER BY
        position ASC
    `,
  ),
  Effect.andThen(Schema.decodeUnknown(Schema.Array(EventRow))),
  Effect.tap(rows => Console.log(`Loaded ${rows.length} events`)),
  Effect.provide(
    Layer.mergeAll(
      LibsqlClient.layer({ url: `file:${path.resolve(import.meta.dirname, '..', 'data', 'events.db')}` }),
      SensitiveDataStoreStub,
    ),
  ),
)

void Effect.runPromise(program)
