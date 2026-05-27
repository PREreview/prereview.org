import { UrlParams } from '@effect/platform'
import { Data, Effect, Either, Schema } from 'effect'

export type RemoveInvitationToAppearForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  removeAuthor: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  removeAuthor: 'yes' | 'no'
}> {}

export const fromBody = Effect.fnUntraced(
  function* (body: UrlParams.UrlParams) {
    const { removeAuthor } = yield* Schema.decode(RemoveAuthorFieldSchema)(body)

    return new CompletedForm({ removeAuthor })
  },
  Effect.catchTag('ParseError', () => Effect.succeed(new InvalidForm({ removeAuthor: Either.left(new Missing()) }))),
)

const RemoveAuthorFieldSchema = UrlParams.schemaRecord(
  Schema.Struct({
    removeAuthor: Schema.Literal('yes', 'no'),
  }),
)
