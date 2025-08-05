import type { Uuid } from '../../types/index.js'
import type * as Errors from '../Errors.js'

export interface Command {
  readonly datasetReviewId: Uuid.Uuid
}

export type Error =
  | Errors.DatasetReviewHasNotBeenStarted
  | Errors.PublicationOfDatasetReviewWasNotRequested
  | Errors.DatasetReviewNotReadyToBeMarkedAsPublished
