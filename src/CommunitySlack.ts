import { Context, Effect, Struct } from 'effect'
import type { Slack } from './ExternalApis/index.ts'

export class CommunitySlackChannelIds extends Context.Tag('CommunitySlackChannelIds')<
  CommunitySlackChannelIds,
  { shareAReview: Slack.ChannelId }
>() {}

export const shareAReviewChannelId = Effect.andThen(CommunitySlackChannelIds, Struct.get('shareAReview'))
