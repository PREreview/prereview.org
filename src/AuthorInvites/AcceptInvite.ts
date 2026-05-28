import type * as Commands from '../Commands.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Instant } from '../types/Temporal.ts'
import type { Uuid } from '../types/Uuid.ts'

export interface Input {
  readonly invitationId: Uuid
  readonly orcidId: OrcidId
  readonly acceptedAt: Instant
}

export type Error = unknown

type State = unknown

export declare const AcceptInvite: Commands.Command<'AuthorInviteAccepted', [Input], State, Error>
