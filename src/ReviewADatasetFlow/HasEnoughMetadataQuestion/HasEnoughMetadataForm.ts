import { UrlParams } from '@effect/platform'
import { Data, Effect, Either, Option, Schema } from 'effect'

export type HasEnoughMetadataForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  hasEnoughMetadata: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  hasEnoughMetadata: 'yes' | 'partly' | 'no' | 'unsure'
}> {}

export const fromBody = Effect.fn(
  function* (body: UrlParams.UrlParams) {
    const { hasEnoughMetadata } = yield* Schema.decode(HasEnoughMetadataFieldSchema)(body)

    return new CompletedForm({ hasEnoughMetadata })
  },
  Effect.catchTag('ParseError', () =>
    Effect.succeed(new InvalidForm({ hasEnoughMetadata: Either.left(new Missing()) })),
  ),
)

export const fromAnswer: (answer: Option.Option<'yes' | 'partly' | 'no' | 'unsure'>) => HasEnoughMetadataForm =
  Option.match({
    onNone: () => new EmptyForm(),
    onSome: answer => new CompletedForm({ hasEnoughMetadata: answer }),
  })

const HasEnoughMetadataFieldSchema = UrlParams.schemaRecord(
  Schema.Struct({
    hasEnoughMetadata: Schema.Literal('yes', 'partly', 'no', 'unsure'),
  }),
)
