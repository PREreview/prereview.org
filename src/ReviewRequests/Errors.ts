import { Data } from 'effect'

export class UnknownReviewRequest extends Data.TaggedError('UnknownReviewRequest')<{ cause?: unknown }> {}
