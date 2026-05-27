import type { Either } from 'effect'
import type * as Queries from '../../Queries.ts'
import type { OrcidId, Uuid } from '../../types/index.ts'
import type * as Errors from '../Errors.ts'

export interface Input {
  datasetReviewId: Uuid.Uuid
  invitationId: Uuid.Uuid
  authorId: OrcidId.OrcidId
}

export type Result = Either.Either<
  void,
  | Errors.DatasetReviewHasNotBeenStarted
  | Errors.DatasetReviewWasStartedByAnotherUser
  | Errors.DatasetReviewIsBeingPublished
  | Errors.DatasetReviewHasBeenPublished
  | Errors.DatasetReviewDoesNotNeedInvitationsToAppear
  | Errors.DatasetReviewInvitationNotInList
>

export declare const CheckIfUserCanRemoveInvitationToAppearOnADatasetReviewFromTheList: Queries.OnDemandQuery<
  | 'DatasetReviewWasStarted'
  | 'AnsweredIfOthersNeedToBeListedOnTheReview'
  | 'InvitationToAppearOnADatasetReviewAddedToTheList'
  | 'InvitationToAppearOnADatasetReviewRemovedFromTheList'
  | 'PublicationOfDatasetReviewWasRequested'
  | 'DatasetReviewWasPublished',
  [Input],
  Either.Either.Right<Result>,
  Either.Either.Left<Result>
>
