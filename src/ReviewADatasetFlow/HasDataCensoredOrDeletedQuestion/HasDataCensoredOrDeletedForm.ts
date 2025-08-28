import { UrlParams } from '@effect/platform'
import { Data, Effect, Either, Option, Schema } from 'effect'

export type HasDataCensoredOrDeletedForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  hasDataCensoredOrDeleted: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  hasDataCensoredOrDeleted: 'yes' | 'partly' | 'no' | 'unsure'
}> {}

export const fromBody = Effect.fn(
  function* (body: UrlParams.UrlParams) {
    const { hasDataCensoredOrDeleted } = yield* Schema.decode(HasDataCensoredOrDeletedSchema)(body)

    return new CompletedForm({ hasDataCensoredOrDeleted })
  },
  Effect.catchTag('ParseError', () =>
    Effect.succeed(new InvalidForm({ hasDataCensoredOrDeleted: Either.left(new Missing()) })),
  ),
)

export const fromAnswer: (answer: Option.Option<'yes' | 'partly' | 'no' | 'unsure'>) => HasDataCensoredOrDeletedForm =
  Option.match({
    onNone: () => new EmptyForm(),
    onSome: answer => new CompletedForm({ hasDataCensoredOrDeleted: answer }),
  })

const HasDataCensoredOrDeletedSchema = UrlParams.schemaRecord(
  Schema.Struct({
    hasDataCensoredOrDeleted: Schema.Literal('yes', 'partly', 'no', 'unsure'),
  }),
)
