import { Data } from 'effect'
import type * as Commands from '../Commands.ts'
import type { Pseudonym, Temporal } from '../types/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'

export interface Input {
  readonly orcidId: OrcidId
  readonly registeredAt: Temporal.Instant
  readonly pseudonym: Pseudonym.Pseudonym
}

type State = unknown

export class PseudonymAlreadyInUse extends Data.TaggedError('PseudonymAlreadyInUse') {}

export class MismatchWithExistingDataForOrcid extends Data.TaggedError('MismatchWithExistingDataForOrcid')<{
  existingPseudonym: Pseudonym.Pseudonym
  existingRegisteredAt: Temporal.Instant
}> {}

export declare const ImportRegisteredPrereviewer: Commands.Command<
  'RegisteredPrereviewerImported',
  [Input],
  State,
  PseudonymAlreadyInUse | MismatchWithExistingDataForOrcid
>
