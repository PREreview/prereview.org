import { Data, type Either } from 'effect'

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
