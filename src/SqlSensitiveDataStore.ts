import { Model, SqlClient, SqlSchema, type SqlError } from '@effect/sql'
import { Array, Effect, Layer, Option, pipe, Record, Schema, Struct, Tuple } from 'effect'
import * as SensitiveDataStore from './SensitiveDataStore.ts'
import { Uuid } from './types/index.ts'

class SensitiveData extends Model.Class<SensitiveData>('SensitiveData')({
  id: Model.GeneratedByApp(Uuid.UuidSchema),
  value: Schema.String,
}) {}

export const make: Effect.Effect<
  SensitiveDataStore.SensitiveDataStore,
  SqlError.SqlError,
  Uuid.GenerateUuid | SqlClient.SqlClient
> = Effect.gen(function* () {
  const generateUuid = (yield* Uuid.GenerateUuid).v4()
  const sql = yield* SqlClient.SqlClient

  yield* sql`CREATE TABLE IF NOT EXISTS sensitive_data (id UUID PRIMARY KEY, value TEXT NOT NULL)`

  const sensitiveData = yield* Model.makeRepository(SensitiveData, {
    tableName: 'sensitive_data',
    spanPrefix: 'SensitiveData',
    idColumn: 'id',
  })

  const findManySchema = SqlSchema.findAll({
    Request: Schema.NonEmptyArray(Uuid.UuidSchema),
    Result: SensitiveData,
    execute: ids => sql`
      SELECT
        *
      FROM
        sensitive_data
      where
        ${sql.in('id', ids)}
    `,
  })

  return {
    get: id =>
      pipe(
        sensitiveData.findById(id),
        Effect.map(Option.map(Struct.get('value'))),
        Effect.catchAllDefect(cause => new SensitiveDataStore.FailedToGetSensitiveData({ cause })),
      ),
    getMany: ids =>
      pipe(
        findManySchema(ids),
        Effect.orDie,
        Effect.map(Array.map(row => Tuple.make(row.id, row.value))),
        Effect.map(Record.fromEntries),
        Effect.catchAllDefect(cause => new SensitiveDataStore.FailedToGetSensitiveData({ cause })),
        Effect.withSpan('SqlSensitiveDataStore.getMany', { attributes: { ids } }),
      ),
    add: value =>
      pipe(
        generateUuid,
        Effect.tap(id => sensitiveData.insert({ id, value })),
        Effect.catchAllDefect(cause => new SensitiveDataStore.FailedToAddSensitiveData({ cause })),
      ),
  } satisfies typeof SensitiveDataStore.SensitiveDataStore.Service
})

export const layer = Layer.effect(SensitiveDataStore.SensitiveDataStore, make)
