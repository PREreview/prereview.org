import { Data } from 'effect'
import type * as Commands from '../Commands.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Uuid } from '../types/Uuid.ts'
import type { Temporal } from '../types/index.ts'

export interface Input {
  readonly reviewId: Uuid
  readonly orcidId: OrcidId
  readonly confirmedAt: Temporal.Instant
}

export class ChoicesDoNotNeedToBeConfirmed extends Data.TaggedError('ChoicesDoNotNeedToBeConfirmed') {}

export class ChoicesCannotBeChanged extends Data.TaggedError('ChoicesCannotBeChanged') {}

export type Error = ChoicesDoNotNeedToBeConfirmed | ChoicesCannotBeChanged

type State = unknown

export declare const ConfirmAuthorChoices: Commands.Command<
  'AuthorInviteAccepted' | 'PersonaForAReviewChosen' | 'AuthorChoicesForAReviewConfirmed' | 'DatasetReviewWasStarted',
  [Input],
  State,
  Error
>
