import { UrlParams } from '@effect/platform'
import { Data, Effect, Either, Option, Schema } from 'effect'

export type MattersToItsAudienceForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  mattersToItsAudience: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  mattersToItsAudience: 'very-consequential' | 'somewhat-consequential' | 'not-consequential' | 'unsure'
}> {}

export const fromBody = Effect.fn(
  function* (body: UrlParams.UrlParams) {
    const { mattersToItsAudience } = yield* Schema.decode(MattersToItsAudienceSchema)(body)

    return new CompletedForm({ mattersToItsAudience })
  },
  Effect.catchTag('ParseError', () =>
    Effect.succeed(new InvalidForm({ mattersToItsAudience: Either.left(new Missing()) })),
  ),
)

export const fromAnswer: (
  answer: Option.Option<{ answer: 'very-consequential' | 'somewhat-consequential' | 'not-consequential' | 'unsure' }>,
) => MattersToItsAudienceForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: ({ answer }) => new CompletedForm({ mattersToItsAudience: answer }),
})

const MattersToItsAudienceSchema = UrlParams.schemaRecord(
  Schema.Struct({
    mattersToItsAudience: Schema.Literal('very-consequential', 'somewhat-consequential', 'not-consequential', 'unsure'),
  }),
)
