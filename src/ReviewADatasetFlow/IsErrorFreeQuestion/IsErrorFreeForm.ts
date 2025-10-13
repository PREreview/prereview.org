import { UrlParams } from '@effect/platform'
import { Data, Effect, Either, Option, pipe, Schema, Struct } from 'effect'
import { NonEmptyString } from '../../types/index.ts'

export type IsErrorFreeForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  isErrorFree: Either.Either<never, Missing>
  isErrorFreeYesDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
  isErrorFreePartlyDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
  isErrorFreeNoDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  isErrorFree: 'yes' | 'partly' | 'no' | 'unsure'
  isErrorFreeYesDetail: Option.Option<NonEmptyString.NonEmptyString>
  isErrorFreePartlyDetail: Option.Option<NonEmptyString.NonEmptyString>
  isErrorFreeNoDetail: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromBody = Effect.fn(function* (body: UrlParams.UrlParams) {
  const isErrorFreeYesDetail = yield* pipe(
    Schema.decode(IsErrorFreeYesDetailSchema)(body),
    Effect.andThen(Struct.get('isErrorFreeYesDetail')),
    Effect.option,
  )
  const isErrorFreePartlyDetail = yield* pipe(
    Schema.decode(IsErrorFreePartlyDetailSchema)(body),
    Effect.andThen(Struct.get('isErrorFreePartlyDetail')),
    Effect.option,
  )
  const isErrorFreeNoDetail = yield* pipe(
    Schema.decode(IsErrorFreeNoDetailSchema)(body),
    Effect.andThen(Struct.get('isErrorFreeNoDetail')),
    Effect.option,
  )

  return yield* pipe(
    Schema.decode(IsErrorFreeSchema)(body),
    Effect.andThen(
      ({ isErrorFree }) =>
        new CompletedForm({
          isErrorFree,
          isErrorFreeYesDetail,
          isErrorFreePartlyDetail,
          isErrorFreeNoDetail,
        }),
    ),
    Effect.catchTag('ParseError', () =>
      Effect.succeed(
        new InvalidForm({
          isErrorFree: Either.left(new Missing()),
          isErrorFreeYesDetail: Either.right(isErrorFreeYesDetail),
          isErrorFreePartlyDetail: Either.right(isErrorFreePartlyDetail),
          isErrorFreeNoDetail: Either.right(isErrorFreeNoDetail),
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

const IsErrorFreeSchema = UrlParams.schemaRecord(
  Schema.Struct({
    isErrorFree: Schema.Literal('yes', 'partly', 'no', 'unsure'),
  }),
)

const IsErrorFreeYesDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    isErrorFreeYesDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)

const IsErrorFreePartlyDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    isErrorFreePartlyDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)

const IsErrorFreeNoDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    isErrorFreeNoDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)
