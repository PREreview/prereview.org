import { Schema } from 'effect'

export class FailedToNotifyCommunitySlack extends Schema.TaggedError<FailedToNotifyCommunitySlack>()(
  'FailedToNotifyCommunitySlack',
  { cause: Schema.optional(Schema.Unknown) },
) {}

export class FailedToNotifyPreprintServer extends Schema.TaggedError<FailedToNotifyPreprintServer>()(
  'FailedToNotifyPreprintServer',
  { cause: Schema.optional(Schema.Unknown) },
) {}
