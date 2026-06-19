import type { Effect } from 'effect'
import { ContactEmailAddressIsUnavailable } from '../contact-email-address.ts'
import type { Email } from '../ExternalInteractions/index.ts'
import type { KeyvStores } from '../keyv.ts'
import type { EmailAddress } from '../types/EmailAddress.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { ContactEmailAddressHasAlreadyBeenVerified } from './VerifyContactEmailAddress.ts'

export interface Input {
  readonly orcidId: OrcidId
  readonly emailAddress: EmailAddress
  readonly resumeAt?: `/${string}`
}

export type Error = ContactEmailAddressHasAlreadyBeenVerified | ContactEmailAddressIsUnavailable

export const StartVerificationOfContactEmailAddress: (
  contactEmailAddressStore: (typeof KeyvStores.Service)['contactEmailAddressStore'],
) => (input: Input) => Effect.Effect<void, Error, Email.Email> = () => () =>
  new ContactEmailAddressIsUnavailable({ cause: 'not implemented' })
