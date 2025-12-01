import { Schema } from 'effect'

export class RejectedRequestReview extends Schema.TaggedError<RejectedRequestReview>('RejectedRequestReview')(
  'RejectedRequestReview',
  {},
) {}

export class FailedToProcessRequestReview extends Schema.TaggedError<FailedToProcessRequestReview>(
  'FailedToProcessRequestReview',
)('FailedToProcessRequestReview', {}) {}
