import { UrlParams } from '@effect/platform'
import { Data, Effect, Either, Option, pipe, Schema, Struct } from 'effect'
import { NonEmptyString } from '../../../types/index.ts'

export type IsDetailedEnoughForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  isDetailedEnough: Either.Either<never, Missing>
  isDetailedEnoughYesDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
  isDetailedEnoughPartlyDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
  isDetailedEnoughNoDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  isDetailedEnough: 'yes' | 'partly' | 'no' | 'unsure'
  isDetailedEnoughYesDetail: Option.Option<NonEmptyString.NonEmptyString>
  isDetailedEnoughPartlyDetail: Option.Option<NonEmptyString.NonEmptyString>
  isDetailedEnoughNoDetail: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromBody = Effect.fn(function* (body: UrlParams.UrlParams) {
  const isDetailedEnoughYesDetail = yield* pipe(
    Schema.decode(IsDetailedEnoughYesDetailSchema)(body),
    Effect.andThen(Struct.get('isDetailedEnoughYesDetail')),
    Effect.option,
  )
  const isDetailedEnoughPartlyDetail = yield* pipe(
    Schema.decode(IsDetailedEnoughPartlyDetailSchema)(body),
    Effect.andThen(Struct.get('isDetailedEnoughPartlyDetail')),
    Effect.option,
  )
  const isDetailedEnoughNoDetail = yield* pipe(
    Schema.decode(IsDetailedEnoughNoDetailSchema)(body),
    Effect.andThen(Struct.get('isDetailedEnoughNoDetail')),
    Effect.option,
  )

  return yield* pipe(
    Schema.decode(IsDetailedEnoughSchema)(body),
    Effect.andThen(
      ({ isDetailedEnough }) =>
        new CompletedForm({
          isDetailedEnough,
          isDetailedEnoughYesDetail,
          isDetailedEnoughPartlyDetail,
          isDetailedEnoughNoDetail,
        }),
    ),
    Effect.catchTag('ParseError', () =>
      Effect.succeed(
        new InvalidForm({
          isDetailedEnough: Either.left(new Missing()),
          isDetailedEnoughYesDetail: Either.right(isDetailedEnoughYesDetail),
          isDetailedEnoughPartlyDetail: Either.right(isDetailedEnoughPartlyDetail),
          isDetailedEnoughNoDetail: Either.right(isDetailedEnoughNoDetail),
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
) => IsDetailedEnoughForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: ({ answer, detail }) =>
    new CompletedForm({
      isDetailedEnough: answer,
      isDetailedEnoughYesDetail: answer === 'yes' ? detail : Option.none(),
      isDetailedEnoughPartlyDetail: answer === 'partly' ? detail : Option.none(),
      isDetailedEnoughNoDetail: answer === 'no' ? detail : Option.none(),
    }),
})

const IsDetailedEnoughSchema = UrlParams.schemaRecord(
  Schema.Struct({
    isDetailedEnough: Schema.Literal('yes', 'partly', 'no', 'unsure'),
  }),
)

const IsDetailedEnoughYesDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    isDetailedEnoughYesDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)

const IsDetailedEnoughPartlyDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    isDetailedEnoughPartlyDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)

const IsDetailedEnoughNoDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    isDetailedEnoughNoDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)
