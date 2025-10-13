import { UrlParams } from '@effect/platform'
import { Data, Effect, Either, Option, Schema } from 'effect'

export type IsErrorFreeForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  isErrorFree: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  isErrorFree: 'yes' | 'partly' | 'no' | 'unsure'
}> {}

export const fromBody = Effect.fn(
  function* (body: UrlParams.UrlParams) {
    const { isErrorFree } = yield* Schema.decode(IsErrorFreeSchema)(body)

    return new CompletedForm({ isErrorFree })
  },
  Effect.catchTag('ParseError', () => Effect.succeed(new InvalidForm({ isErrorFree: Either.left(new Missing()) }))),
)

export const fromAnswer: (answer: Option.Option<{ answer: 'yes' | 'partly' | 'no' | 'unsure' }>) => IsErrorFreeForm =
  Option.match({
    onNone: () => new EmptyForm(),
    onSome: ({ answer }) => new CompletedForm({ isErrorFree: answer }),
  })

const IsErrorFreeSchema = UrlParams.schemaRecord(
  Schema.Struct({
    isErrorFree: Schema.Literal('yes', 'partly', 'no', 'unsure'),
  }),
)
