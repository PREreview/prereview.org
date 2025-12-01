import { type Array, Data, Schema } from 'effect'

export class DatasetReviewHasNotBeenStarted extends Data.TaggedError('DatasetReviewHasNotBeenStarted') {}

export class DatasetReviewWasStartedByAnotherUser extends Data.TaggedError('DatasetReviewWasStartedByAnotherUser') {}

export class DatasetReviewHasBeenPublished extends Data.TaggedError('DatasetReviewHasBeenPublished') {}

export class DatasetReviewIsBeingPublished extends Data.TaggedError('DatasetReviewIsBeingPublished') {}

export class DatasetReviewIsInProgress extends Data.TaggedError('DatasetReviewIsInProgress') {}

export class DatasetReviewNotReadyToBePublished extends Data.TaggedError('DatasetReviewNotReadyToBePublished')<{
  missing: Array.NonEmptyReadonlyArray<
    | 'RatedTheQualityOfTheDataset'
    | 'AnsweredIfTheDatasetFollowsFairAndCarePrinciples'
    | 'AnsweredIfTheDatasetHasEnoughMetadata'
    | 'AnsweredIfTheDatasetHasTrackedChanges'
    | 'AnsweredIfTheDatasetHasDataCensoredOrDeleted'
    | 'AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch'
    | 'AnsweredIfTheDatasetSupportsRelatedConclusions'
    | 'AnsweredIfTheDatasetIsDetailedEnough'
    | 'AnsweredIfTheDatasetMattersToItsAudience'
    | 'AnsweredIfTheDatasetIsErrorFree'
    | 'AnsweredIfTheDatasetIsReadyToBeShared'
    | 'AnsweredIfTheDatasetIsMissingAnything'
    | 'PersonaForDatasetReviewWasChosen'
    | 'CompetingInterestsForADatasetReviewWereDeclared'
    | 'DeclaredThatTheCodeOfConductWasFollowedForADatasetReview'
  >
}> {}

export class PublicationOfDatasetReviewWasNotRequested extends Data.TaggedError(
  'PublicationOfDatasetReviewWasNotRequested',
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

export class FailedToCreateRecordOnZenodo extends Schema.TaggedError<FailedToCreateRecordOnZenodo>(
  'FailedToCreateRecordOnZenodo',
)('FailedToCreateRecordOnZenodo', { cause: Schema.optional(Schema.Unknown) }) {}

export class FailedToNotifyCommunitySlack extends Schema.TaggedError<FailedToNotifyCommunitySlack>(
  'FailedToNotifyCommunitySlack',
)('FailedToNotifyCommunitySlack', { cause: Schema.optional(Schema.Unknown) }) {}

export class FailedToPublishRecordOnZenodo extends Schema.TaggedError<FailedToPublishRecordOnZenodo>(
  'FailedToPublishRecordOnZenodo',
)('FailedToPublishRecordOnZenodo', { cause: Schema.optional(Schema.Unknown) }) {}

export class FailedToUseZenodoDoi extends Schema.TaggedError<FailedToUseZenodoDoi>('FailedToUseZenodoDoi')(
  'FailedToUseZenodoDoi',
  { cause: Schema.optional(Schema.Unknown) },
) {}

export class FailedToMarkDatasetReviewAsPublished extends Schema.TaggedError<FailedToMarkDatasetReviewAsPublished>(
  'FailedToMarkDatasetReviewAsPublished',
)('FailedToMarkDatasetReviewAsPublished', { cause: Schema.optional(Schema.Unknown) }) {}

export class UnexpectedSequenceOfEvents extends Data.TaggedError('UnexpectedSequenceOfEvents')<{ cause?: unknown }> {}

export class UnknownDatasetReview extends Data.TaggedError('UnknownDatasetReview')<{ cause?: unknown }> {}
