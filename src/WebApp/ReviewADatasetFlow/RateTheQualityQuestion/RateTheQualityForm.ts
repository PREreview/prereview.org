import { UrlParams } from '@effect/platform'
import { Data, Effect, Either, Option, pipe, Schema, Struct } from 'effect'
import { NonEmptyString } from '../../../types/index.ts'

export type RateTheQualityForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  qualityRating: Either.Either<never, Missing>
  qualityRatingExcellentDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
  qualityRatingFairDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
  qualityRatingPoorDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
}> {}

export const fromBody = Effect.fn(function* (body: UrlParams.UrlParams) {
  const qualityRatingExcellentDetail = yield* pipe(
    Schema.decode(QualityRatingExcellentDetailSchema)(body),
    Effect.andThen(Struct.get('qualityRatingExcellentDetail')),
    Effect.option,
  )
  const qualityRatingFairDetail = yield* pipe(
    Schema.decode(QualityRatingFairDetailSchema)(body),
    Effect.andThen(Struct.get('qualityRatingFairDetail')),
    Effect.option,
  )
  const qualityRatingPoorDetail = yield* pipe(
    Schema.decode(QualityRatingPoorDetailSchema)(body),
    Effect.andThen(Struct.get('qualityRatingPoorDetail')),
    Effect.option,
  )

  return yield* pipe(
    Schema.decode(QualityRatingSchema)(body),
    Effect.andThen(
      ({ qualityRating }) =>
        new CompletedForm({
          qualityRating,
          qualityRatingExcellentDetail,
          qualityRatingFairDetail,
          qualityRatingPoorDetail,
        }),
    ),
    Effect.catchTag('ParseError', () =>
      Effect.succeed(
        new InvalidForm({
          qualityRating: Either.left(new Missing()),
          qualityRatingExcellentDetail: Either.right(qualityRatingExcellentDetail),
          qualityRatingFairDetail: Either.right(qualityRatingFairDetail),
          qualityRatingPoorDetail: Either.right(qualityRatingPoorDetail),
        }),
      ),
    ),
  )
})

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  qualityRating: 'excellent' | 'fair' | 'poor' | 'unsure'
  qualityRatingExcellentDetail: Option.Option<NonEmptyString.NonEmptyString>
  qualityRatingFairDetail: Option.Option<NonEmptyString.NonEmptyString>
  qualityRatingPoorDetail: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromAnswer: (
  answer: Option.Option<{
    rating: 'excellent' | 'fair' | 'poor' | 'unsure'
    detail: Option.Option<NonEmptyString.NonEmptyString>
  }>,
) => RateTheQualityForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: ({ rating, detail }) =>
    new CompletedForm({
      qualityRating: rating,
      qualityRatingExcellentDetail: rating === 'excellent' ? detail : Option.none(),
      qualityRatingFairDetail: rating === 'fair' ? detail : Option.none(),
      qualityRatingPoorDetail: rating === 'poor' ? detail : Option.none(),
    }),
})

const QualityRatingSchema = UrlParams.schemaRecord(
  Schema.Struct({
    qualityRating: Schema.Literal('excellent', 'fair', 'poor', 'unsure'),
  }),
)

const QualityRatingExcellentDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    qualityRatingExcellentDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)

const QualityRatingFairDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    qualityRatingFairDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)

const QualityRatingPoorDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    qualityRatingPoorDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)
