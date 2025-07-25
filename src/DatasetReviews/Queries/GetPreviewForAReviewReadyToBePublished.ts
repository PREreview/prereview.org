import type { Either } from 'effect'
import type * as Errors from '../Errors.js'
import type * as Events from '../Events.js'

export interface DatasetReviewPreview {
  readonly answerToIfTheDatasetFollowsFairAndCarePrinciples: Events.AnsweredIfTheDatasetFollowsFairAndCarePrinciples['answer']
}

export declare const GetPreviewForAReviewReadyToBePublished: (
  events: ReadonlyArray<Events.DatasetReviewEvent>,
) => Either.Either<
  DatasetReviewPreview,
  | Errors.DatasetReviewNotReadyToBePublished
  | Errors.DatasetReviewIsBeingPublished
  | Errors.DatasetReviewHasBeenPublished
  | Errors.UnexpectedSequenceOfEvents
>
