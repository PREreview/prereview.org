import type { Either } from 'effect'
import type * as Queries from '../../Queries.ts'
import type { EmailAddress, NonEmptyString, Uuid } from '../../types/index.ts'
import type * as Errors from '../Errors.ts'

export interface Input {
  datasetReviewId: Uuid.Uuid
}

export interface InvitationToAppear {
  invitationId: Uuid.Uuid
  name: NonEmptyString.NonEmptyString
  emailAddress: EmailAddress.EmailAddress
}

export type Result = Either.Either<
  ReadonlyArray<InvitationToAppear>,
  Errors.DatasetReviewHasNotBeenStarted | Errors.DatasetReviewDoesNotNeedInvitationsToAppear
>

export declare const GetListOfInvitationsToAppearOnADatasetReview: Queries.OnDemandQuery<
  | 'DatasetReviewWasStarted'
  | 'AnsweredIfOthersNeedToBeListedOnTheReview'
  | 'InvitationToAppearOnADatasetReviewAddedToTheList'
  | 'InvitationToAppearOnADatasetReviewRemovedFromTheList',
  [Input],
  Either.Either.Right<Result>,
  Either.Either.Left<Result>
>
