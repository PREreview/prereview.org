import { Data } from 'effect'

export type FeedbackError =
  | FeedbackWasAlreadyStarted
  | FeedbackHasNotBeenStarted
  | FeedbackIsIncomplete
  | FeedbackWasAlreadyPublished

export class FeedbackWasAlreadyStarted extends Data.TaggedError('FeedbackWasAlreadyStarted') {}

export class FeedbackHasNotBeenStarted extends Data.TaggedError('FeedbackHasNotBeenStarted') {}

export class FeedbackIsIncomplete extends Data.TaggedError('FeedbackIsIncomplete') {}

export class FeedbackWasAlreadyPublished extends Data.TaggedError('FeedbackWasAlreadyPublished') {}
