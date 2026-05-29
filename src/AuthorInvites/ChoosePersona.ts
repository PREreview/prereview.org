import { Data } from 'effect'
import type * as Commands from '../Commands.ts'
import type { Uuid } from '../types/Uuid.ts'

export interface Input {
  readonly invitationId: Uuid
  readonly persona: 'public' | 'pseudonym'
}

export class InvitationNotFound extends Data.TaggedError('InvitationNotFound') {}

export class InvitationNotAccepted extends Data.TaggedError('InvitationNotAccepted') {}

export type Error = InvitationNotFound | InvitationNotAccepted

type State = unknown

export declare const ChoosePersona: Commands.Command<'AuthorInviteAccepted', [Input], State, Error>
