import { UrlParams } from '@effect/platform'
import { Data, Effect, Either, Schema } from 'effect'

export type RequestedReviewNotificationsForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  requestedReviewNotifications: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  requestedReviewNotifications: 'yes' | 'no'
}> {}

export const fromBody = Effect.fnUntraced(
  function* (body: UrlParams.UrlParams) {
    const { requestedReviewNotifications } = yield* Schema.decode(RequestedReviewNotificationsFieldSchema)(body)

    return new CompletedForm({ requestedReviewNotifications })
  },
  Effect.catchTag('ParseError', () =>
    Effect.succeed(new InvalidForm({ requestedReviewNotifications: Either.left(new Missing()) })),
  ),
)

const RequestedReviewNotificationsFieldSchema = UrlParams.schemaRecord(
  Schema.Struct({
    requestedReviewNotifications: Schema.Literal('yes', 'no'),
  }),
)
