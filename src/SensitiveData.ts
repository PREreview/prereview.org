import { Effect, Option, pipe, Schema, SchemaIssue, SchemaGetter } from 'effect'
import * as SensitiveDataStore from './SensitiveDataStore.ts'
import { Uuid } from './types/index.ts'

export const SensitiveData = <A, I, R>(schema: Schema.Codec<A, I, R, R>) =>
  Uuid.UuidSchema.pipe(
    Schema.decodeTo(Schema.Option(Schema.fromJsonString(schema)), {
      decode: SchemaGetter.transformEffect(id =>
        pipe(
          SensitiveDataStore.get(id),
          Effect.catchTag('FailedToGetSensitiveData', () =>
            Effect.fail(new SchemaIssue.InvalidValue({ message: 'Failed to get sensitive data' }, id)),
          ),
        ),
      ),
      encode: SchemaGetter.transformEffect(value =>
        Option.match(value, {
          onSome: value =>
            pipe(
              SensitiveDataStore.add(value),
              Effect.catchTag('FailedToAddSensitiveData', () =>
                Effect.fail(new SchemaIssue.InvalidValue({ message: 'Failed to add sensitive data' }, value)),
              ),
            ),
          onNone: () =>
            Effect.fail(new SchemaIssue.Forbidden({ message: 'Sensitive data must have an initial value' }, value)),
        }),
      ),
    }),
  )
