import { Model, SqlClient, type SqlError } from '@effect/sql'
import { Effect, Layer, Option, pipe, Schema, Struct } from 'effect'
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
  const generateUuid = yield* Uuid.GenerateUuid
  const sql = yield* SqlClient.SqlClient

  yield* sql`CREATE TABLE IF NOT EXISTS sensitive_data (id UUID PRIMARY KEY, value TEXT NOT NULL)`

  const sensitiveData = yield* Model.makeRepository(SensitiveData, {
    tableName: 'sensitive_data',
    spanPrefix: 'SensitiveData',
    idColumn: 'id',
  })

  return {
    get: id =>
      pipe(
        sensitiveData.findById(id),
        Effect.map(Option.map(Struct.get('value'))),
        Effect.catchAllDefect(cause => new SensitiveDataStore.FailedToGetSensitiveData({ cause })),
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
