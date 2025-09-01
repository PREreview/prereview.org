import { UrlParams } from '@effect/platform'
import { Data, Effect, Either, Option, Schema } from 'effect'

export type IsAppropriateForThisKindOfResearchForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  isAppropriateForThisKindOfResearch: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  isAppropriateForThisKindOfResearch: 'yes' | 'partly' | 'no' | 'unsure'
}> {}

export const fromBody = Effect.fn(
  function* (body: UrlParams.UrlParams) {
    const { isAppropriateForThisKindOfResearch } = yield* Schema.decode(IsAppropriateForThisKindOfResearchSchema)(body)

    return new CompletedForm({ isAppropriateForThisKindOfResearch })
  },
  Effect.catchTag('ParseError', () =>
    Effect.succeed(new InvalidForm({ isAppropriateForThisKindOfResearch: Either.left(new Missing()) })),
  ),
)

export const fromAnswer: (
  answer: Option.Option<'yes' | 'partly' | 'no' | 'unsure'>,
) => IsAppropriateForThisKindOfResearchForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: answer => new CompletedForm({ isAppropriateForThisKindOfResearch: answer }),
})

const IsAppropriateForThisKindOfResearchSchema = UrlParams.schemaRecord(
  Schema.Struct({
    isAppropriateForThisKindOfResearch: Schema.Literal('yes', 'partly', 'no', 'unsure'),
  }),
)
