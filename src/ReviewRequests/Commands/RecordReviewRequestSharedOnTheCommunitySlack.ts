import type { Slack } from '../../ExternalApis/index.ts'
import type { Uuid } from '../../types/index.ts'
import type * as Errors from '../Errors.ts'

export interface Command {
  readonly channelId: Slack.ChannelId
  readonly messageTimestamp: Slack.Timestamp
  readonly reviewRequestId: Uuid.Uuid
}

export type Error = Errors.ReviewRequestWasAlreadySharedOnTheCommunitySlack
