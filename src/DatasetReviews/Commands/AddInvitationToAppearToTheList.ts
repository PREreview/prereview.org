import type * as Commands from '../../Commands.ts'
import type { EmailAddress, NonEmptyString, OrcidId, Uuid } from '../../types/index.ts'
import type * as Errors from '../Errors.ts'

export interface Input {
  readonly name: NonEmptyString.NonEmptyString
  readonly emailAddress: EmailAddress.EmailAddress
  readonly invitationId: Uuid.Uuid
  readonly datasetReviewId: Uuid.Uuid
  readonly userId: OrcidId.OrcidId
}

export type Error =
  | Errors.DatasetReviewHasNotBeenStarted
  | Errors.DatasetReviewDoesNotNeedInvitationsToAppear
  | Errors.DatasetReviewIsBeingPublished
  | Errors.DatasetReviewHasBeenPublished

type State = unknown

export declare const AddInvitationToAppearToTheList: Commands.Command<
  | 'DatasetReviewWasStarted'
  | 'AnsweredIfOthersNeedToBeListedOnTheReview'
  | 'InvitationToAppearOnADatasetReviewAddedToTheList'
  | 'PublicationOfDatasetReviewWasRequested'
  | 'DatasetReviewWasPublished',
  [Input],
  State,
  Error,
  true
>
