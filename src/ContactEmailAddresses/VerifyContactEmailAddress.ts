import { Data, type Effect } from 'effect'
import { type ContactEmailAddressIsNotFound, ContactEmailAddressIsUnavailable } from '../contact-email-address.ts'
import type * as Keyv from '../keyv.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Uuid } from '../types/Uuid.ts'

export interface Input {
  orcid: OrcidId
  verificationToken: Uuid
}

export class ContactEmailAddressHasAlreadyBeenVerified extends Data.TaggedError(
  'ContactEmailAddressHasAlreadyBeenVerified',
) {}

export class VerificationTokenInvalid extends Data.TaggedError('VerificationTokenInvalid') {}

export type Error =
  | ContactEmailAddressHasAlreadyBeenVerified
  | VerificationTokenInvalid
  | ContactEmailAddressIsNotFound
  | ContactEmailAddressIsUnavailable

export const VerifyContactEmailAddress: (
  store: (typeof Keyv.KeyvStores.Service)['contactEmailAddressStore'],
) => (input: Input) => Effect.Effect<void, Error> = () => () => new ContactEmailAddressIsUnavailable({})
