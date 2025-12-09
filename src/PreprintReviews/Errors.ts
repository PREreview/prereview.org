import { Schema } from 'effect'

export class FailedToNotifyPreprintServer extends Schema.TaggedError<FailedToNotifyPreprintServer>(
  'FailedToNotifyPreprintServer',
)('FailedToNotifyPreprintServer', { cause: Schema.optional(Schema.Unknown) }) {}
