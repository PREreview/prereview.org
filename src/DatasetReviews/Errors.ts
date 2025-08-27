import { type Array, Data } from 'effect'

export class DatasetReviewHasNotBeenStarted extends Data.TaggedError('DatasetReviewHasNotBeenStarted') {}

export class DatasetReviewWasStartedByAnotherUser extends Data.TaggedError('DatasetReviewWasStartedByAnotherUser') {}

export class DatasetReviewHasBeenPublished extends Data.TaggedError('DatasetReviewHasBeenPublished') {}

export class DatasetReviewIsBeingPublished extends Data.TaggedError('DatasetReviewIsBeingPublished') {}

export class DatasetReviewIsInProgress extends Data.TaggedError('DatasetReviewIsInProgress') {}

export class DatasetReviewNotReadyToBePublished extends Data.TaggedError('DatasetReviewNotReadyToBePublished')<{
  missing: Array.NonEmptyReadonlyArray<
    'AnsweredIfTheDatasetFollowsFairAndCarePrinciples' | 'AnsweredIfTheDatasetHasEnoughMetadata'
  >
}> {}

export class PublicationOfDatasetReviewWasNotRequested extends Data.TaggedError(
  'DatasetReviewPublicationOfDatasetReviewWasNotRequestedNotReadyToBePublished',
) {}

export class DatasetReviewNotReadyToBeMarkedAsPublished extends Data.TaggedError(
  'DatasetReviewNotReadyToBeMarkedAsPublished',
)<{
  missing: Array.NonEmptyReadonlyArray<'DatasetReviewWasAssignedADoi'>
}> {}

export class DatasetReviewHasNotBeenPublished extends Data.TaggedError('DatasetReviewHasNotBeenPublished')<{
  cause?: unknown
}> {}

export class DatasetReviewWasAlreadyStarted extends Data.TaggedError('DatasetReviewWasAlreadyStarted') {}

export class DatasetReviewAlreadyHasADoi extends Data.TaggedError('DatasetReviewAlreadyHasADoi')<{
  cause?: unknown
}> {}

export class DatasetReviewHasNotBeenAssignedADoi extends Data.TaggedError('DatasetReviewHasNotBeenAssignedADoi')<{
  cause?: unknown
}> {}

export class DatasetReviewAlreadyHasAZenodoRecord extends Data.TaggedError('DatasetReviewAlreadyHasAZenodoRecord')<{
  cause?: unknown
}> {}

export class DatasetReviewDoesNotHaveAZenodoRecord extends Data.TaggedError('DatasetReviewDoesNotHaveAZenodoRecord')<{
  cause?: unknown
}> {}

export class FailedToCreateRecordOnZenodo extends Data.TaggedError('FailedToCreateRecordOnZenodo')<{
  cause?: unknown
}> {}

export class FailedToPublishRecordOnZenodo extends Data.TaggedError('FailedToPublishRecordOnZenodo')<{
  cause?: unknown
}> {}

export class FailedToUseZenodoDoi extends Data.TaggedError('FailedToUseZenodoDoi')<{
  cause?: unknown
}> {}

export class FailedToMarkDatasetReviewAsPublished extends Data.TaggedError('FailedToMarkDatasetReviewAsPublished')<{
  cause?: unknown
}> {}

export class UnexpectedSequenceOfEvents extends Data.TaggedError('UnexpectedSequenceOfEvents')<{ cause?: unknown }> {}

export class UnknownDatasetReview extends Data.TaggedError('UnknownDatasetReview')<{ cause?: unknown }> {}
