import { UrlParams } from '@effect/platform'
import { Data, Effect, Either, Option, Schema } from 'effect'

export type HasTrackedChangesForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  hasTrackedChanges: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  hasTrackedChanges: 'yes' | 'partly' | 'no' | 'unsure'
}> {}

export const fromBody = Effect.fn(
  function* (body: UrlParams.UrlParams) {
    const { hasTrackedChanges } = yield* Schema.decode(HasTrackedChangesFieldSchema)(body)

    return new CompletedForm({ hasTrackedChanges })
  },
  Effect.catchTag('ParseError', () =>
    Effect.succeed(new InvalidForm({ hasTrackedChanges: Either.left(new Missing()) })),
  ),
)

export const fromAnswer: (
  answer: Option.Option<{ answer: 'yes' | 'partly' | 'no' | 'unsure' }>,
) => HasTrackedChangesForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: ({ answer }) => new CompletedForm({ hasTrackedChanges: answer }),
})

const HasTrackedChangesFieldSchema = UrlParams.schemaRecord(
  Schema.Struct({
    hasTrackedChanges: Schema.Literal('yes', 'partly', 'no', 'unsure'),
  }),
)
