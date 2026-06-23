import { Data } from 'effect'
import type { EmailAddress } from '../types/EmailAddress.ts'
import type { Uuid } from '../types/Uuid.ts'

export class ContactEmailAddressIsNotFound extends Data.TaggedError('ContactEmailAddressIsNotFound') {}

export class ContactEmailAddressIsUnavailable extends Data.TaggedError('ContactEmailAddressIsUnavailable')<{
  cause?: unknown
}> {}

export type ContactEmailAddress = VerifiedContactEmailAddress | UnverifiedContactEmailAddress

export class VerifiedContactEmailAddress extends Data.TaggedClass('VerifiedContactEmailAddress')<{
  value: EmailAddress
}> {}

export class UnverifiedContactEmailAddress extends Data.TaggedClass('UnverifiedContactEmailAddress')<{
  value: EmailAddress
  verificationToken: Uuid
}> {}
