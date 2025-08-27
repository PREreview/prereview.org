import type { Either } from 'effect'
import type { Orcid, Uuid } from '../../types/index.js'
import type * as Errors from '../Errors.js'

export interface Input {
  datasetReviewId: Uuid.Uuid
  userId: Orcid.Orcid
}

export type Result = Either.Either<
  void,
  | Errors.DatasetReviewHasNotBeenStarted
  | Errors.DatasetReviewWasStartedByAnotherUser
  | Errors.DatasetReviewIsBeingPublished
  | Errors.DatasetReviewHasBeenPublished
>
