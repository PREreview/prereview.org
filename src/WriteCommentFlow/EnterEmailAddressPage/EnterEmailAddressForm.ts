import { Data, type Either } from 'effect'
import type { EmailAddress } from '../../types/index.js'

export type EnterEmailAddressForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class Invalid extends Data.TaggedError('Invalid')<{ value: string }> {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  emailAddress: Either.Either<never, Missing | Invalid>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  emailAddress: EmailAddress.EmailAddress
}> {}
