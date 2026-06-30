import { Data } from 'effect'
import type { EmailAddress } from '../types/EmailAddress.ts'
import type { Uuid } from '../types/Uuid.ts'

export type ContactEmailAddress = VerifiedContactEmailAddress | UnverifiedContactEmailAddress

export class VerifiedContactEmailAddress extends Data.TaggedClass('VerifiedContactEmailAddress')<{
  value: EmailAddress
  contactAddressId?: Uuid
}> {}

export class UnverifiedContactEmailAddress extends Data.TaggedClass('UnverifiedContactEmailAddress')<{
  value: EmailAddress
  contactAddressId: Uuid
}> {}
