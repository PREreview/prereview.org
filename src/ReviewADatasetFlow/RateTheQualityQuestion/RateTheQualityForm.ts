import { UrlParams } from '@effect/platform'
import { Data, Effect, Either, Option, Schema } from 'effect'

export type RateTheQualityForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  qualityRating: Either.Either<never, Missing>
}> {}

export const fromBody = Effect.fn(
  function* (body: UrlParams.UrlParams) {
    const { qualityRating } = yield* Schema.decode(QualityRatingSchema)(body)

    return new CompletedForm({ qualityRating })
  },
  Effect.catchTag('ParseError', () => Effect.succeed(new InvalidForm({ qualityRating: Either.left(new Missing()) }))),
)

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  qualityRating: 'excellent' | 'fair' | 'poor' | 'unsure'
}> {}

export const fromAnswer: (
  answer: Option.Option<{ rating: 'excellent' | 'fair' | 'poor' | 'unsure' }>,
) => RateTheQualityForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: ({ rating }) => new CompletedForm({ qualityRating: rating }),
})

const QualityRatingSchema = UrlParams.schemaRecord(
  Schema.Struct({
    qualityRating: Schema.Literal('excellent', 'fair', 'poor', 'unsure'),
  }),
)
