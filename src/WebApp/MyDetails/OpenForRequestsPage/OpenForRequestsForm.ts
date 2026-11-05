import type { UrlParams } from 'effect/http'
import { Data, Effect, Schema } from 'effect'

export type OpenForRequestsForm = InvalidForm | CompletedForm

export class InvalidForm extends Data.TaggedClass('InvalidForm') {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  openForRequests: 'yes' | 'no'
}> {}

export const fromBody = Effect.fnUntraced(
  function* (body: UrlParams.UrlParams) {
    const { openForRequests } = yield* Schema.decodeEffect(OpenForRequestsFieldSchema)(body)

    return new CompletedForm({ openForRequests })
  },
  Effect.catchTag('SchemaError', () => Effect.succeed(new InvalidForm())),
)

const OpenForRequestsFieldSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      openForRequests: Schema.Literals(['yes', 'no']),
    }),
  ),
)
