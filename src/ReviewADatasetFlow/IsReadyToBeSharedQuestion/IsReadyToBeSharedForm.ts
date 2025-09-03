import { UrlParams } from '@effect/platform'
import { Data, Effect, Either, Option, Schema } from 'effect'

export type IsReadyToBeSharedForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  isReadyToBeShared: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  isReadyToBeShared: 'yes' | 'no' | 'unsure'
}> {}

export const fromBody = Effect.fn(
  function* (body: UrlParams.UrlParams) {
    const { isReadyToBeShared } = yield* Schema.decode(IsReadyToBeSharedSchema)(body)

    return new CompletedForm({ isReadyToBeShared })
  },
  Effect.catchTag('ParseError', () =>
    Effect.succeed(new InvalidForm({ isReadyToBeShared: Either.left(new Missing()) })),
  ),
)

export const fromAnswer: (answer: Option.Option<'yes' | 'no' | 'unsure'>) => IsReadyToBeSharedForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: answer => new CompletedForm({ isReadyToBeShared: answer }),
})

const IsReadyToBeSharedSchema = UrlParams.schemaRecord(
  Schema.Struct({
    isReadyToBeShared: Schema.Literal('yes', 'no', 'unsure'),
  }),
)
