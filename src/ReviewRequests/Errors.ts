import { Data, Schema } from 'effect'

export class FailedToNotifyCommunitySlack extends Schema.TaggedError<FailedToNotifyCommunitySlack>(
  'FailedToNotifyCommunitySlack',
)('FailedToNotifyCommunitySlack', { cause: Schema.optional(Schema.Unknown) }) {}

export class ReviewRequestWasAlreadySharedOnTheCommunitySlack extends Schema.TaggedError<ReviewRequestWasAlreadySharedOnTheCommunitySlack>(
  'ReviewRequestWasAlreadySharedOnTheCommunitySlack',
)('ReviewRequestWasAlreadySharedOnTheCommunitySlack', { cause: Schema.optional(Schema.Unknown) }) {}

export class UnknownReviewRequest extends Data.TaggedError('UnknownReviewRequest')<{ cause?: unknown }> {}
