import { Effect, Option, ParseResult, pipe, Schema } from 'effect'
import * as SensitiveDataStore from './SensitiveDataStore.ts'
import { Uuid } from './types/index.ts'

export const SensitiveData = <A, I, R>(schema: Schema.Schema<A, I, R>) =>
  Schema.transformOrFail(Uuid.UuidSchema, Schema.OptionFromSelf(Schema.parseJson(schema)), {
    strict: true,
    decode: (id, _, ast) =>
      pipe(
        SensitiveDataStore.get(id),
        Effect.catchTag('FailedToGetSensitiveData', () =>
          ParseResult.fail(new ParseResult.Type(ast, id, 'Failed to get sensitive data')),
        ),
      ),
    encode: (value, _, ast) =>
      Option.match(value, {
        onSome: value =>
          pipe(
            SensitiveDataStore.add(value),
            Effect.catchTag('FailedToAddSensitiveData', () =>
              ParseResult.fail(new ParseResult.Type(ast, value, 'Failed to add sensitive data')),
            ),
          ),
        onNone: () =>
          ParseResult.fail(new ParseResult.Forbidden(ast, value, 'Sensitive data must have an initial value')),
      }),
  })
