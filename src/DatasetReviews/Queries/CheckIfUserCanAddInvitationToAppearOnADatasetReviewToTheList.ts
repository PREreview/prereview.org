import type { Either } from 'effect'
import type * as Queries from '../../Queries.ts'
import type { OrcidId, Uuid } from '../../types/index.ts'
import type * as Errors from '../Errors.ts'

export interface Input {
  datasetReviewId: Uuid.Uuid
  authorId: OrcidId.OrcidId
}

export type Result = Either.Either<
  void,
  | Errors.DatasetReviewHasNotBeenStarted
  | Errors.DatasetReviewWasStartedByAnotherUser
  | Errors.DatasetReviewIsBeingPublished
  | Errors.DatasetReviewHasBeenPublished
  | Errors.DatasetReviewDoesNotNeedInvitationsToAppear
>

export declare const CheckIfUserCanAddInvitationToAppearOnADatasetReviewToTheList: Queries.OnDemandQuery<
  | 'DatasetReviewWasStarted'
  | 'AnsweredIfOthersNeedToBeListedOnTheReview'
  | 'PublicationOfDatasetReviewWasRequested'
  | 'DatasetReviewWasPublished',
  [Input],
  Either.Either.Right<Result>,
  Either.Either.Left<Result>
>
