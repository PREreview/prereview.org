import { Data } from 'effect'
import type * as Command from '../Commands.ts'
import type { OrcidId, Pseudonym, Temporal } from '../types/index.ts'

export interface Input {
  readonly orcidId: OrcidId.OrcidId
  readonly replacedAt: Temporal.Instant
  readonly pseudonym: Pseudonym.Pseudonym
}

type State = unknown

export type Error = PseudonymAlreadyInUse | PrereviewerDoesNotHaveLegacyPseudonym | PrereviewerNotRegistered

export class PseudonymAlreadyInUse extends Data.TaggedError('PseudonymAlreadyInUse') {}

export class PrereviewerDoesNotHaveLegacyPseudonym extends Data.TaggedError('PrereviewerDoesNotHaveLegacyPseudonym') {}

export class PrereviewerNotRegistered extends Data.TaggedError('PrereviewerNotRegistered') {}

export declare const ReplaceLegacyPseudonym: (
  possiblePseudonyms: Set<Pseudonym.Pseudonym>,
) => Command.Command<
  'RegisteredPrereviewerImported' | 'PrereviewerRegistered' | 'LegacyPseudonymReplaced',
  [Input],
  State,
  Error
>
