import { Data, Schema } from 'effect'

export class FailedToProcessReceivedReviewRequest extends Schema.TaggedError<FailedToProcessReceivedReviewRequest>()(
  'FailedToProcessReceivedReviewRequest',
  { cause: Schema.optional(Schema.Unknown) },
) {}

export class FailedToCategorizeReviewRequest extends Schema.TaggedError<FailedToCategorizeReviewRequest>()(
  'FailedToCategorizeReviewRequest',
  { cause: Schema.optional(Schema.Unknown) },
) {}

export class FailedToAcknowledgeReviewRequest extends Schema.TaggedError<FailedToAcknowledgeReviewRequest>()(
  'FailedToAcknowledgeReviewRequest',
  { cause: Schema.optional(Schema.Unknown) },
) {}

export class FailedToNotifyCommunitySlack extends Schema.TaggedError<FailedToNotifyCommunitySlack>()(
  'FailedToNotifyCommunitySlack',
  { cause: Schema.optional(Schema.Unknown) },
) {}

export class ReviewRequestWasAlreadyCategorized extends Schema.TaggedError<ReviewRequestWasAlreadyCategorized>()(
  'ReviewRequestWasAlreadyCategorized',
  { cause: Schema.optional(Schema.Unknown) },
) {}

export class ReviewRequestCannotBeAcknowledged extends Data.TaggedError('ReviewRequestCannotBeAcknowledged')<{
  cause?: unknown
}> {}

export class ReviewRequestWasAlreadyAcknowledged extends Data.TaggedError('ReviewRequestWasAlreadyAcknowledged')<{
  cause?: unknown
}> {}

export class ReviewRequestWasAlreadySharedOnTheCommunitySlack extends Schema.TaggedError<ReviewRequestWasAlreadySharedOnTheCommunitySlack>()(
  'ReviewRequestWasAlreadySharedOnTheCommunitySlack',
  { cause: Schema.optional(Schema.Unknown) },
) {}

export class NoReviewRequestsFound extends Data.TaggedError('NoReviewRequestsFound')<{ cause?: unknown }> {}

export class ReviewRequestHasBeenAccepted extends Data.TaggedError('ReviewRequestHasBeenAccepted')<{
  cause?: unknown
}> {}

export class ReviewRequestHasNotBeenAccepted extends Data.TaggedError('ReviewRequestHasNotBeenAccepted')<{
  cause?: unknown
}> {}

export class ReviewRequestHasBeenRejected extends Data.TaggedError('ReviewRequestHasBeenRejected')<{
  cause?: unknown
}> {}

export class UnknownReviewRequest extends Data.TaggedError('UnknownReviewRequest')<{ cause?: unknown }> {}
