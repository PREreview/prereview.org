import { Data, Schema } from 'effect'

export class FailedToCategorizeReviewRequest extends Schema.TaggedError<FailedToCategorizeReviewRequest>()(
  'FailedToCategorizeReviewRequest',
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

export class ReviewRequestWasAlreadySharedOnTheCommunitySlack extends Schema.TaggedError<ReviewRequestWasAlreadySharedOnTheCommunitySlack>()(
  'ReviewRequestWasAlreadySharedOnTheCommunitySlack',
  { cause: Schema.optional(Schema.Unknown) },
) {}

export class NoReviewRequestsFound extends Data.TaggedError('NoReviewRequestsFound')<{ cause?: unknown }> {}

export class ReviewRequestHasBeenAccepted extends Data.TaggedError('ReviewRequestHasBeenAccepted')<{
  cause?: unknown
}> {}

export class ReviewRequestHasBeenRejected extends Data.TaggedError('ReviewRequestHasBeenRejected')<{
  cause?: unknown
}> {}

export class UnknownReviewRequest extends Data.TaggedError('UnknownReviewRequest')<{ cause?: unknown }> {}
