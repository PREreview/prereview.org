import { Schema } from 'effect'

export class RejectedRequestReview extends Schema.TaggedError<RejectedRequestReview>('RejectedRequestReview')(
  'RejectedRequestReview',
  { cause: Schema.optional(Schema.Unknown) },
) {}

export class FailedToProcessRequestReview extends Schema.TaggedError<FailedToProcessRequestReview>(
  'FailedToProcessRequestReview',
)('FailedToProcessRequestReview', { cause: Schema.optional(Schema.Unknown) }) {}
