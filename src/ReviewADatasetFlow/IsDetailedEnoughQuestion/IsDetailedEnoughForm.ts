import { UrlParams } from '@effect/platform'
import { Data, Effect, Either, Option, Schema } from 'effect'

export type IsDetailedEnoughForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  isDetailedEnough: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  isDetailedEnough: 'yes' | 'partly' | 'no' | 'unsure'
}> {}

export const fromBody = Effect.fn(
  function* (body: UrlParams.UrlParams) {
    const { isDetailedEnough } = yield* Schema.decode(IsDetailedEnoughSchema)(body)

    return new CompletedForm({ isDetailedEnough })
  },
  Effect.catchTag('ParseError', () =>
    Effect.succeed(new InvalidForm({ isDetailedEnough: Either.left(new Missing()) })),
  ),
)

export const fromAnswer: (answer: Option.Option<'yes' | 'partly' | 'no' | 'unsure'>) => IsDetailedEnoughForm =
  Option.match({
    onNone: () => new EmptyForm(),
    onSome: answer => new CompletedForm({ isDetailedEnough: answer }),
  })

const IsDetailedEnoughSchema = UrlParams.schemaRecord(
  Schema.Struct({
    isDetailedEnough: Schema.Literal('yes', 'partly', 'no', 'unsure'),
  }),
)
