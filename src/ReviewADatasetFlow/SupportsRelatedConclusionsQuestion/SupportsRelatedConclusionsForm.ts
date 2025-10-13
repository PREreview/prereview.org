import { UrlParams } from '@effect/platform'
import { Data, Effect, Either, Option, Schema } from 'effect'

export type SupportsRelatedConclusionsForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  supportsRelatedConclusions: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  supportsRelatedConclusions: 'yes' | 'partly' | 'no' | 'unsure'
}> {}

export const fromBody = Effect.fn(
  function* (body: UrlParams.UrlParams) {
    const { supportsRelatedConclusions } = yield* Schema.decode(SupportsRelatedConclusionsSchema)(body)

    return new CompletedForm({ supportsRelatedConclusions })
  },
  Effect.catchTag('ParseError', () =>
    Effect.succeed(new InvalidForm({ supportsRelatedConclusions: Either.left(new Missing()) })),
  ),
)

export const fromAnswer: (
  answer: Option.Option<{ answer: 'yes' | 'partly' | 'no' | 'unsure' }>,
) => SupportsRelatedConclusionsForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: ({ answer }) => new CompletedForm({ supportsRelatedConclusions: answer }),
})

const SupportsRelatedConclusionsSchema = UrlParams.schemaRecord(
  Schema.Struct({
    supportsRelatedConclusions: Schema.Literal('yes', 'partly', 'no', 'unsure'),
  }),
)
