import { Data } from 'effect'
import type * as Commands from '../Commands.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Uuid } from '../types/Uuid.ts'

export interface Input {
  readonly reviewId: Uuid
  readonly orcidId: OrcidId
  readonly persona: 'public' | 'pseudonym'
}

export class PersonaDoesNotNeedToBeChosen extends Data.TaggedError('PersonaDoesNotNeedToBeChosen') {}

export class PersonaCannotBeChanged extends Data.TaggedError('PersonaCannotBeChanged') {}

export type Error = PersonaDoesNotNeedToBeChosen | PersonaCannotBeChanged

type State = unknown

export declare const ChoosePersona: Commands.Command<'AuthorInviteAccepted', [Input], State, Error>
