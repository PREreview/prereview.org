import { Data, Schema } from 'effect'

export class FailedToCategorizeReviewRequest extends Schema.TaggedError<FailedToCategorizeReviewRequest>(
  'FailedToCategorizeReviewRequest',
)('FailedToCategorizeReviewRequest', { cause: Schema.optional(Schema.Unknown) }) {}

export class FailedToNotifyCommunitySlack extends Schema.TaggedError<FailedToNotifyCommunitySlack>(
  'FailedToNotifyCommunitySlack',
)('FailedToNotifyCommunitySlack', { cause: Schema.optional(Schema.Unknown) }) {}

export class ReviewRequestWasAlreadyCategorized extends Schema.TaggedError<ReviewRequestWasAlreadyCategorized>(
  'ReviewRequestWasAlreadyCategorized',
)('ReviewRequestWasAlreadyCategorized', { cause: Schema.optional(Schema.Unknown) }) {}

export class ReviewRequestWasAlreadySharedOnTheCommunitySlack extends Schema.TaggedError<ReviewRequestWasAlreadySharedOnTheCommunitySlack>(
  'ReviewRequestWasAlreadySharedOnTheCommunitySlack',
)('ReviewRequestWasAlreadySharedOnTheCommunitySlack', { cause: Schema.optional(Schema.Unknown) }) {}

export class UnknownReviewRequest extends Data.TaggedError('UnknownReviewRequest')<{ cause?: unknown }> {}
