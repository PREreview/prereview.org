import type { Temporal } from '@js-temporal/polyfill'
import type * as Commands from '../Commands.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Uuid } from '../types/Uuid.ts'
import type { AcceptedInvitationIsNotFound, ContactEmailAddressHasAlreadyBeenVerified } from './Errors.ts'

export interface Input {
  readonly orcidId: OrcidId
  readonly inviteId: Uuid
  readonly chosenAt: Temporal.Instant
}

export type Error = ContactEmailAddressHasAlreadyBeenVerified | AcceptedInvitationIsNotFound

type State = unknown

export declare const UseAuthorInviteEmailAddressUsingEvents: Commands.Command<[Input], State, Error, true>
