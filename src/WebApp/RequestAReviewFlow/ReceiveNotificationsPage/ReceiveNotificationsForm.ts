import type { UrlParams } from 'effect/http'
import { Data, Result, pipe, Schema, Struct } from 'effect'

export type ReceiveNotificationsForm = EmptyForm | InvalidForm | CompletedForm

export type ValidForm = Exclude<ReceiveNotificationsForm, InvalidForm>

export type SubmittedForm = Exclude<ReceiveNotificationsForm, EmptyForm>

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  receiveNotifications: Result.Result<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  receiveNotifications: 'yes' | 'no'
}> {}

export const fromBody = (body: UrlParams.UrlParams): SubmittedForm => {
  const receiveNotifications = pipe(
    Schema.decodeResult(ReceiveNotificationsFieldSchema)(body),
    Result.mapBoth({
      onSuccess: Struct.get('receiveNotifications'),
      onFailure: () => new Missing(),
    }),
  )

  return Result.match(receiveNotifications, {
    onSuccess: receiveNotifications => new CompletedForm({ receiveNotifications }),
    onFailure: receiveNotifications => new InvalidForm({ receiveNotifications: Result.fail(receiveNotifications) }),
  })
}

const ReceiveNotificationsFieldSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      receiveNotifications: Schema.Literals(['yes', 'no']),
    }),
  ),
)
