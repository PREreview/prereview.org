import { Data, Match, type Either } from 'effect'
import type { ContactAddress } from '../../../ReviewRequests/index.ts'
import type { EmailAddress } from '../../../types/index.ts'

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

export const fromContactAddress = Match.typeTags<ContactAddress, EnterEmailAddressForm>()({
  VerifiedContactAddress: contactAddress => new CompletedForm({ emailAddress: contactAddress.value }),
  UnverifiedContactAddress: contactAddress => new CompletedForm({ emailAddress: contactAddress.value }),
  NoContactAddress: () => new EmptyForm(),
})
