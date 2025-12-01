import type { Slack } from '../../ExternalApis/index.ts'
import type { Uuid } from '../../types/index.ts'

export interface Command {
  readonly channelId: Slack.ChannelId
  readonly messageTimestamp: Slack.Timestamp
  readonly reviewRequestId: Uuid.Uuid
}
