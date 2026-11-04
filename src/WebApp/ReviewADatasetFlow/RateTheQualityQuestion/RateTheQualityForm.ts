import type { UrlParams } from 'effect/http'
import { Data, Effect, Result, Option, pipe, Schema, Struct, flow } from 'effect'
import { NonEmptyString } from '../../../types/index.ts'

export type RateTheQualityForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  qualityRating: Result.Result<never, Missing>
  qualityRatingExcellentDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
  qualityRatingFairDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
  qualityRatingPoorDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
}> {}

export const fromBody = Effect.fnUntraced(function* (body: UrlParams.UrlParams) {
  const qualityRatingExcellentDetail = yield* pipe(
    Schema.decodeEffect(QualityRatingExcellentDetailSchema)(body),
    Effect.andThen(flow(Struct.get('qualityRatingExcellentDetail'), Effect.fromOption)),
    Effect.option,
  )
  const qualityRatingFairDetail = yield* pipe(
    Schema.decodeEffect(QualityRatingFairDetailSchema)(body),
    Effect.andThen(flow(Struct.get('qualityRatingFairDetail'), Effect.fromOption)),
    Effect.option,
  )
  const qualityRatingPoorDetail = yield* pipe(
    Schema.decodeEffect(QualityRatingPoorDetailSchema)(body),
    Effect.andThen(flow(Struct.get('qualityRatingPoorDetail'), Effect.fromOption)),
    Effect.option,
  )

  return yield* pipe(
    Schema.decodeEffect(QualityRatingSchema)(body),
    Effect.map(
      ({ qualityRating }) =>
        new CompletedForm({
          qualityRating,
          qualityRatingExcellentDetail,
          qualityRatingFairDetail,
          qualityRatingPoorDetail,
        }),
    ),
    Effect.catchTag('SchemaError', () =>
      Effect.succeed(
        new InvalidForm({
          qualityRating: Result.fail(new Missing()),
          qualityRatingExcellentDetail: Result.succeed(qualityRatingExcellentDetail),
          qualityRatingFairDetail: Result.succeed(qualityRatingFairDetail),
          qualityRatingPoorDetail: Result.succeed(qualityRatingPoorDetail),
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

const QualityRatingSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      qualityRating: Schema.Literals(['excellent', 'fair', 'poor', 'unsure']),
    }),
  ),
)

const QualityRatingExcellentDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      qualityRatingExcellentDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)

const QualityRatingFairDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      qualityRatingFairDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)

const QualityRatingPoorDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      qualityRatingPoorDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)
