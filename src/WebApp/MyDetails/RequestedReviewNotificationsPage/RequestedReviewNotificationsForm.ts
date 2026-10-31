import type { UrlParams } from 'effect/http'
import { Data, Effect, Result, Schema } from 'effect'

export type RequestedReviewNotificationsForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  requestedReviewNotifications: Result.Result<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  requestedReviewNotifications: 'yes' | 'no'
}> {}

export const fromBody = Effect.fnUntraced(
  function* (body: UrlParams.UrlParams) {
    const { requestedReviewNotifications } = yield* Schema.decodeEffect(RequestedReviewNotificationsFieldSchema)(body)

    return new CompletedForm({ requestedReviewNotifications })
  },
  Effect.catchTag('SchemaError', () =>
    Effect.succeed(new InvalidForm({ requestedReviewNotifications: Result.fail(new Missing()) })),
  ),
)

const RequestedReviewNotificationsFieldSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      requestedReviewNotifications: Schema.Literals(['yes', 'no']),
    }),
  ),
)
