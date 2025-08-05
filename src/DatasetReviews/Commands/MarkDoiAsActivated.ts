import { Data } from 'effect'
import type { Doi, Uuid } from '../../types/index.js'
import type * as Errors from '../Errors.js'

export interface Command {
  readonly datasetReviewId: Uuid.Uuid
}

export type Error =
  | Errors.DatasetReviewHasNotBeenStarted
  | Errors.DatasetReviewIsBeingPublished
  | Errors.DatasetReviewIsInProgress
  | Errors.DatasetReviewHasNotBeenAssignedADoi

export type State = NotStarted | NotPublished | HasNotBeenAssignedADoi | HasAnInactiveDoi | HasAnActiveDoi

export class NotStarted extends Data.TaggedClass('NotStarted') {}

export class NotPublished extends Data.TaggedClass('NotPublished') {}

export class HasNotBeenAssignedADoi extends Data.TaggedClass('HasNotBeenAssignedADoi') {}

export class HasAnInactiveDoi extends Data.TaggedClass('HasAnInactiveDoi')<{ doi: Doi.Doi }> {}

export class HasAnActiveDoi extends Data.TaggedClass('HasAnActiveDoi')<{ doi: Doi.Doi }> {}
