import { Data } from 'effect'

export class UnknownDatasetReview extends Data.TaggedError('UnknownDatasetReview')<{ cause?: unknown }> {}
