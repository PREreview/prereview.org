import type { UrlParams } from 'effect/http'
import { Data, Effect, Result, Option, pipe, Schema, Struct, flow } from 'effect'
import { NonEmptyString } from '../../../types/index.ts'

export type IsErrorFreeForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  isErrorFree: Result.Result<never, Missing>
  isErrorFreeYesDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
  isErrorFreePartlyDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
  isErrorFreeNoDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  isErrorFree: 'yes' | 'partly' | 'no' | 'unsure'
  isErrorFreeYesDetail: Option.Option<NonEmptyString.NonEmptyString>
  isErrorFreePartlyDetail: Option.Option<NonEmptyString.NonEmptyString>
  isErrorFreeNoDetail: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromBody = Effect.fnUntraced(function* (body: UrlParams.UrlParams) {
  const isErrorFreeYesDetail = yield* pipe(
    Schema.decodeEffect(IsErrorFreeYesDetailSchema)(body),
    Effect.andThen(flow(Struct.get('isErrorFreeYesDetail'), Effect.fromOption)),
    Effect.option,
  )
  const isErrorFreePartlyDetail = yield* pipe(
    Schema.decodeEffect(IsErrorFreePartlyDetailSchema)(body),
    Effect.andThen(flow(Struct.get('isErrorFreePartlyDetail'), Effect.fromOption)),
    Effect.option,
  )
  const isErrorFreeNoDetail = yield* pipe(
    Schema.decodeEffect(IsErrorFreeNoDetailSchema)(body),
    Effect.andThen(flow(Struct.get('isErrorFreeNoDetail'), Effect.fromOption)),
    Effect.option,
  )

  return yield* pipe(
    Schema.decodeEffect(IsErrorFreeSchema)(body),
    Effect.map(
      ({ isErrorFree }) =>
        new CompletedForm({
          isErrorFree,
          isErrorFreeYesDetail,
          isErrorFreePartlyDetail,
          isErrorFreeNoDetail,
        }),
    ),
    Effect.catchTag('SchemaError', () =>
      Effect.succeed(
        new InvalidForm({
          isErrorFree: Result.fail(new Missing()),
          isErrorFreeYesDetail: Result.succeed(isErrorFreeYesDetail),
          isErrorFreePartlyDetail: Result.succeed(isErrorFreePartlyDetail),
          isErrorFreeNoDetail: Result.succeed(isErrorFreeNoDetail),
        }),
      ),
    ),
  )
})

export const fromAnswer: (
  answer: Option.Option<{
    answer: 'yes' | 'partly' | 'no' | 'unsure'
    detail: Option.Option<NonEmptyString.NonEmptyString>
  }>,
) => IsErrorFreeForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: ({ answer, detail }) =>
    new CompletedForm({
      isErrorFree: answer,
      isErrorFreeYesDetail: answer === 'yes' ? detail : Option.none(),
      isErrorFreePartlyDetail: answer === 'partly' ? detail : Option.none(),
      isErrorFreeNoDetail: answer === 'no' ? detail : Option.none(),
    }),
})

const IsErrorFreeSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      isErrorFree: Schema.Literals(['yes', 'partly', 'no', 'unsure']),
    }),
  ),
)

const IsErrorFreeYesDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      isErrorFreeYesDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)

const IsErrorFreePartlyDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      isErrorFreePartlyDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)

const IsErrorFreeNoDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      isErrorFreeNoDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)
