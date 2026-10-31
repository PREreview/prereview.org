import { Config, Context, Effect, Layer, Struct } from 'effect'
import type { Slack } from '../../ExternalApis/index.ts'

export class CommunitySlackChannelIds extends Context.Service<
  CommunitySlackChannelIds,
  { requestAReview: Slack.ChannelId; shareAReview: Slack.ChannelId }
>()('CommunitySlackChannelIds') {}

export const requestAReviewChannelId = Effect.map(CommunitySlackChannelIds, Struct.get('requestAReview'))

export const shareAReviewChannelId = Effect.map(CommunitySlackChannelIds, Struct.get('shareAReview'))

export const layerChannelIds = (
  options: typeof CommunitySlackChannelIds.Service,
): Layer.Layer<CommunitySlackChannelIds> => Layer.succeed(CommunitySlackChannelIds, options)

export const layerChannelIdsConfig = (options: Config.Wrap<Parameters<typeof layerChannelIds>[0]>) =>
  Layer.unwrap(Effect.map(Config.unwrap(options), layerChannelIds))
