import { Data } from 'effect'

export type FeedbackError = FeedbackAlreadyStarted | FeedbackNotStarted | FeedbackIncomplete | FeedbackAlreadyPublished

export class FeedbackAlreadyStarted extends Data.TaggedError('FeedbackAlreadyStarted') {}

export class FeedbackNotStarted extends Data.TaggedError('FeedbackNotStarted') {}

export class FeedbackIncomplete extends Data.TaggedError('FeedbackIncomplete') {}

export class FeedbackAlreadyPublished extends Data.TaggedError('FeedbackAlreadyPublished') {}
