import { Data } from 'effect'

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
