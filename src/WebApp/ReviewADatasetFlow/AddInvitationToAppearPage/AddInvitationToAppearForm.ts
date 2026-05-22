import { Data, type Either } from 'effect'
import type { EmailAddress, NonEmptyString } from '../../../types/index.ts'

export type AddInvitationToAppearForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class Invalid extends Data.TaggedError('Invalid')<{ actual: NonEmptyString.NonEmptyString }> {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  name: Either.Either<NonEmptyString.NonEmptyString, Missing>
  emailAddress: Either.Either<EmailAddress.EmailAddress, Missing | Invalid>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  name: NonEmptyString.NonEmptyString
  emailAddress: EmailAddress.EmailAddress
}> {}
