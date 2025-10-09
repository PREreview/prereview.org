import { UrlParams } from '@effect/platform'
import { Data, Effect, Either, Option, Schema } from 'effect'

export type FollowsFairAndCarePrinciplesForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  followsFairAndCarePrinciples: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  followsFairAndCarePrinciples: 'yes' | 'partly' | 'no' | 'unsure'
}> {}

export const fromBody = Effect.fn(
  function* (body: UrlParams.UrlParams) {
    const { followsFairAndCarePrinciples } = yield* Schema.decode(FollowsFairAndCarePrinciplesFieldSchema)(body)

    return new CompletedForm({ followsFairAndCarePrinciples })
  },
  Effect.catchTag('ParseError', () =>
    Effect.succeed(new InvalidForm({ followsFairAndCarePrinciples: Either.left(new Missing()) })),
  ),
)

export const fromAnswer: (
  answer: Option.Option<{ answer: 'yes' | 'partly' | 'no' | 'unsure' }>,
) => FollowsFairAndCarePrinciplesForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: ({ answer }) => new CompletedForm({ followsFairAndCarePrinciples: answer }),
})

const FollowsFairAndCarePrinciplesFieldSchema = UrlParams.schemaRecord(
  Schema.Struct({
    followsFairAndCarePrinciples: Schema.Literal('yes', 'partly', 'no', 'unsure'),
  }),
)
