import { Data, type Effect } from 'effect'
import { ContactEmailAddressIsUnavailable } from '../contact-email-address.ts'
import type * as Keyv from '../keyv.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Uuid } from '../types/Uuid.ts'
import type { ContactEmailAddressHasAlreadyBeenVerified } from './VerifyContactEmailAddress.ts'

export interface Input {
  readonly orcidId: OrcidId
  readonly inviteId: Uuid
}

export class AcceptedInvitationIsNotFound extends Data.TaggedError('AcceptedInvitationIsNotFound') {}

export type Error =
  | ContactEmailAddressHasAlreadyBeenVerified
  | AcceptedInvitationIsNotFound
  | ContactEmailAddressIsUnavailable

export const UseAuthorInviteEmailAddress: (
  contactEmailAddressStore: (typeof Keyv.KeyvStores.Service)['contactEmailAddressStore'],
) => (input: Input) => Effect.Effect<void, Error> = () => () =>
  new ContactEmailAddressIsUnavailable({ cause: 'not implemented' })
