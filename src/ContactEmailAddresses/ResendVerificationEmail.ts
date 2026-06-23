import type { Effect } from 'effect'
import { type ContactEmailAddressIsNotFound, ContactEmailAddressIsUnavailable } from '../contact-email-address.ts'
import type { Locale } from '../Context.ts'
import type { Email, OrcidRecords } from '../ExternalInteractions/index.ts'
import type * as Keyv from '../keyv.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { ContactEmailAddressHasAlreadyBeenVerified } from './VerifyContactEmailAddress.ts'

export interface Input {
  readonly orcidId: OrcidId
  readonly resumeAt: `/${string}`
}

export type Error =
  | ContactEmailAddressHasAlreadyBeenVerified
  | ContactEmailAddressIsNotFound
  | ContactEmailAddressIsUnavailable

export const ResendVerificationEmail: (
  contactEmailAddressStore: (typeof Keyv.KeyvStores.Service)['contactEmailAddressStore'],
) => (input: Input) => Effect.Effect<void, Error, Email.Email | Locale | OrcidRecords.OrcidRecords> = () => () =>
  new ContactEmailAddressIsUnavailable({ cause: 'not implemented' })
