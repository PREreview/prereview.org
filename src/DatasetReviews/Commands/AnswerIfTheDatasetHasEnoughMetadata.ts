import type { Uuid } from '../../types/index.js'
import type * as Errors from '../Errors.js'

export interface Command {
  readonly answer: 'yes' | 'partly' | 'no' | 'unsure'
  readonly datasetReviewId: Uuid.Uuid
}

export type Error =
  | Errors.DatasetReviewHasNotBeenStarted
  | Errors.DatasetReviewIsBeingPublished
  | Errors.DatasetReviewHasBeenPublished
