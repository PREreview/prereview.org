import { Schema } from 'effect'

export class RejectedRequestReview extends Schema.TaggedError<RejectedRequestReview>()('RejectedRequestReview', {
  cause: Schema.optional(Schema.Defect()),
}) {}

export class FailedToProcessRequestReview extends Schema.TaggedError<FailedToProcessRequestReview>()(
  'FailedToProcessRequestReview',
  { cause: Schema.optional(Schema.Defect()) },
) {}
