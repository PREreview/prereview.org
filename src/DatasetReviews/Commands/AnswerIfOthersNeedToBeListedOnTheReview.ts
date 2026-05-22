import type * as Commands from '../../Commands.ts'
import type { OrcidId, Uuid } from '../../types/index.ts'
import type * as Errors from '../Errors.ts'

export interface Input {
  readonly answer: 'yes' | 'no'
  readonly datasetReviewId: Uuid.Uuid
  readonly userId: OrcidId.OrcidId
}

export type Error =
  | Errors.DatasetReviewHasNotBeenStarted
  | Errors.DatasetReviewIsBeingPublished
  | Errors.DatasetReviewHasBeenPublished

type State = undefined

export declare const AnswerIfOthersNeedToBeListedOnTheReview: Commands.Command<
  | 'DatasetReviewWasStarted'
  | 'AnsweredIfOthersNeedToBeListedOnTheReview'
  | 'PublicationOfDatasetReviewWasRequested'
  | 'DatasetReviewWasPublished',
  [Input],
  State,
  Error,
  true
>
