import type { Either, Option } from 'effect'
import type * as Events from '../../Events.ts'
import type * as Queries from '../../Queries.ts'
import type { OrcidId, Uuid } from '../../types/index.ts'
import type * as Errors from '../Errors.ts'

export interface Input {
  datasetReviewId: Uuid.Uuid
  authorId: OrcidId.OrcidId
}

export type Result = Either.Either<
  Option.Option<Events.AnsweredIfOthersNeedToBeListedOnTheReview['answer']>,
  | Errors.DatasetReviewHasNotBeenStarted
  | Errors.DatasetReviewWasStartedByAnotherUser
  | Errors.DatasetReviewIsBeingPublished
  | Errors.DatasetReviewHasBeenPublished
>

export declare const CheckIfUserCanAnswerIfOthersNeedToBeListedOnTheReview: Queries.OnDemandQuery<
  | 'DatasetReviewWasStarted'
  | 'AnsweredIfOthersNeedToBeListedOnTheReview'
  | 'PublicationOfDatasetReviewWasRequested'
  | 'DatasetReviewWasPublished',
  [Input],
  Either.Either.Right<Result>,
  Either.Either.Left<Result>
>
