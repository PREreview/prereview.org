import { Data, Schema } from 'effect'

export type CommentError =
  | CommentWasAlreadyStarted
  | CommentHasNotBeenStarted
  | CommentIsIncomplete
  | CommentIsBeingPublished
  | DoiIsNotAssigned
  | DoiIsAlreadyAssigned
  | CommentWasAlreadyPublished

export class CommentWasAlreadyStarted extends Data.TaggedError('CommentWasAlreadyStarted') {}

export class CommentHasNotBeenStarted extends Data.TaggedError('CommentHasNotBeenStarted') {}

export class CommentIsIncomplete extends Data.TaggedError('CommentIsIncomplete') {}

export class CommentIsBeingPublished extends Data.TaggedError('CommentIsBeingPublished') {}

export class DoiIsNotAssigned extends Data.TaggedError('DoiIsNotAssigned') {}

export class DoiIsAlreadyAssigned extends Data.TaggedError('DoiIsAlreadyAssigned') {}

export class CommentWasAlreadyPublished extends Data.TaggedError('CommentWasAlreadyPublished') {}

export class CommentHasNotBeenPublished extends Data.TaggedError('CommentHasNotBeenPublished') {}

export class UnableToAssignADoi extends Schema.TaggedError<UnableToAssignADoi>()('UnableToAssignADoi', {
  cause: Schema.optional(Schema.Defect()),
}) {}

export class UnableToPublishComment extends Schema.TaggedError<UnableToPublishComment>()('UnableToPublishComment', {
  cause: Schema.optional(Schema.Defect()),
}) {}

export class UnableToCheckForAVerifiedEmailAddress extends Schema.TaggedError<UnableToCheckForAVerifiedEmailAddress>()(
  'UnableToCheckForAVerifiedEmailAddress',
  { cause: Schema.optional(Schema.Defect()) },
) {}

export class UnableToWithdrawCommentOnZenodo extends Schema.TaggedError<UnableToWithdrawCommentOnZenodo>()(
  'UnableToWithdrawCommentOnZenodo',
  { cause: Schema.optional(Schema.Defect()) },
) {}
