import { UrlParams } from '@effect/platform'
import { Data, Either, pipe, Schema, Struct } from 'effect'

export type ReceiveNotificationsForm = EmptyForm | InvalidForm | CompletedForm

export type ValidForm = Exclude<ReceiveNotificationsForm, InvalidForm>

export type SubmittedForm = Exclude<ReceiveNotificationsForm, EmptyForm>

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  receiveNotifications: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  receiveNotifications: 'yes' | 'no'
}> {}

export const fromBody = (body: UrlParams.UrlParams): SubmittedForm => {
  const receiveNotifications = pipe(
    Schema.decodeEither(ReceiveNotificationsFieldSchema)(body),
    Either.mapBoth({
      onRight: Struct.get('receiveNotifications'),
      onLeft: () => new Missing(),
    }),
  )

  return Either.match(receiveNotifications, {
    onRight: receiveNotifications => new CompletedForm({ receiveNotifications }),
    onLeft: receiveNotifications => new InvalidForm({ receiveNotifications: Either.left(receiveNotifications) }),
  })
}

const ReceiveNotificationsFieldSchema = UrlParams.schemaRecord(
  Schema.Struct({
    receiveNotifications: Schema.Literal('yes', 'no'),
  }),
)
