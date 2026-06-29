import type { Temporal } from '@js-temporal/polyfill'
import type * as Commands from '../Commands.ts'
import type { EmailAddress } from '../types/EmailAddress.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Uuid } from '../types/Uuid.ts'
import type { ContactEmailAddressHasAlreadyBeenVerified } from './Errors.ts'

export interface Input {
  readonly orcidId: OrcidId
  readonly inviteId: Uuid
  readonly emailAddress: EmailAddress
  readonly chosenAt: Temporal.Instant
}

export type Error = ContactEmailAddressHasAlreadyBeenVerified

type State = unknown

export declare const UseAuthorInviteEmailAddressFromLegacyInvite: Commands.Command<[Input], State, Error>
