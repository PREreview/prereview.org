import { type Array, Data } from 'effect'

export class DatasetReviewHasNotBeenStarted extends Data.TaggedError('DatasetReviewHasNotBeenStarted') {}

export class DatasetReviewHasBeenPublished extends Data.TaggedError('DatasetReviewHasBeenPublished') {}

export class DatasetReviewIsBeingPublished extends Data.TaggedError('DatasetReviewIsBeingPublished') {}

export class DatasetReviewIsInProgress extends Data.TaggedError('DatasetReviewIsInProgress') {}

export class DatasetReviewNotReadyToBePublished extends Data.TaggedError('DatasetReviewNotReadyToBePublished')<{
  missing: Array.NonEmptyReadonlyArray<'AnsweredIfTheDatasetFollowsFairAndCarePrinciples'>
}> {}

export class DatasetReviewWasAlreadyStarted extends Data.TaggedError('DatasetReviewWasAlreadyStarted') {}

export class FailedToCreateRecordOnZenodo extends Data.TaggedError('FailedToCreateRecordOnZenodo')<{
  cause?: unknown
}> {}

export class UnexpectedSequenceOfEvents extends Data.TaggedError('UnexpectedSequenceOfEvents')<{ cause?: unknown }> {}

export class UnknownDatasetReview extends Data.TaggedError('UnknownDatasetReview')<{ cause?: unknown }> {}
