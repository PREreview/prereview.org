import { Either } from 'effect'
import * as Errors from '../Errors.js'
import type * as Events from '../Events.js'

export interface DatasetReviewPreview {
  readonly answerToIfTheDatasetFollowsFairAndCarePrinciples: Events.AnsweredIfTheDatasetFollowsFairAndCarePrinciples['answer']
}

export const GetPreviewForAReviewReadyToBePublished = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  events: ReadonlyArray<Events.DatasetReviewEvent>,
): Either.Either<
  DatasetReviewPreview,
  | Errors.DatasetReviewNotReadyToBePublished
  | Errors.DatasetReviewIsBeingPublished
  | Errors.DatasetReviewHasBeenPublished
  | Errors.UnexpectedSequenceOfEvents
> => Either.left(new Errors.UnexpectedSequenceOfEvents({ cause: 'Query not implemented' }))
