import { Data, Effect, Option, pipe, Schema, SchemaGetter, SchemaIssue } from 'effect'
import { Uuid } from '../types/index.ts'
import * as SensitiveDataStore from './SensitiveDataStore.ts'

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

export class SensitiveDataReference extends Data.TaggedClass('SensitiveDataReference')<{ readonly id: Uuid.Uuid }> {}

export const LazySensitiveData = <A, I, R>(schema: Schema.Codec<A, I, R, R>) =>
  Uuid.UuidSchema.pipe(
    Schema.decodeTo(
      Schema.Union([Schema.instanceOf(SensitiveDataReference), Schema.Option(Schema.fromJsonString(schema))]),
      {
        decode: SchemaGetter.transform(id => new SensitiveDataReference({ id })),
        encode: SchemaGetter.transformEffect(value =>
          value instanceof SensitiveDataReference
            ? Effect.succeed(value.id)
            : Option.match(value, {
                onSome: value =>
                  pipe(
                    SensitiveDataStore.add(value),
                    Effect.catchTag('FailedToAddSensitiveData', () =>
                      Effect.fail(new SchemaIssue.InvalidValue({ message: 'Failed to add sensitive data' }, value)),
                    ),
                  ),
                onNone: () =>
                  Effect.fail(
                    new SchemaIssue.Forbidden({ message: 'Sensitive data must have an initial value' }, value),
                  ),
              }),
        ),
      },
    ),
  )

export const resolveSensitiveData =
  <A, I, R>(schema: Schema.Codec<A, I, R, R>) =>
  (reference: SensitiveDataReference) =>
    pipe(
      SensitiveDataStore.get(reference.id),
      Effect.flatMap(
        Option.match({
          onNone: () => Effect.succeedNone,
          onSome: value => Effect.asSome(Schema.decodeEffect(Schema.fromJsonString(schema))(value)),
        }),
      ),
    )
