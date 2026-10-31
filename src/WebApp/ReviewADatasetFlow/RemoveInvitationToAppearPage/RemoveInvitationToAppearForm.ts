import type { UrlParams } from 'effect/http'
import { Data, Effect, Result, Schema } from 'effect'

export type RemoveInvitationToAppearForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  removeAuthor: Result.Result<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  removeAuthor: 'yes' | 'no'
}> {}

export const fromBody = Effect.fnUntraced(
  function* (body: UrlParams.UrlParams) {
    const { removeAuthor } = yield* Schema.decodeEffect(RemoveAuthorFieldSchema)(body)

    return new CompletedForm({ removeAuthor })
  },
  Effect.catchTag('SchemaError', () => Effect.succeed(new InvalidForm({ removeAuthor: Result.fail(new Missing()) }))),
)

const RemoveAuthorFieldSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      removeAuthor: Schema.Literals(['yes', 'no']),
    }),
  ),
)
