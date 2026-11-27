import { Data, Schema } from 'effect'

export class FailedToNotifyCommunitySlack extends Schema.TaggedError<FailedToNotifyCommunitySlack>()(
  'FailedToNotifyCommunitySlack',
  { cause: Schema.optional(Schema.Defect()) },
) {}

export class FailedToNotifyPreprintServer extends Schema.TaggedError<FailedToNotifyPreprintServer>()(
  'FailedToNotifyPreprintServer',
  { cause: Schema.optional(Schema.Defect()) },
) {}

export class FailedToNotifyReviewRequesters extends Schema.TaggedError<FailedToNotifyReviewRequesters>()(
  'FailedToNotifyReviewRequesters',
  { cause: Schema.optional(Schema.Defect()) },
) {}

export class PreprintReviewHasAlreadyBeenAddedToAClub extends Data.TaggedError(
  'PreprintReviewHasAlreadyBeenAddedToAClub',
) {}

export class PreprintReviewNotFound extends Data.TaggedError('PreprintReviewNotFound')<{ cause?: unknown }> {}

export class PrereviewsAreUnavailable extends Data.TaggedError('PrereviewsAreUnavailable') {}

export class UnknownClub extends Data.TaggedError('UnknownClub') {}
