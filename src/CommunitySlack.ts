import { Config, Context, Effect, Layer, Struct } from 'effect'
import type { Slack } from './ExternalApis/index.ts'

export class CommunitySlackChannelIds extends Context.Tag('CommunitySlackChannelIds')<
  CommunitySlackChannelIds,
  { shareAReview: Slack.ChannelId }
>() {}

export const shareAReviewChannelId = Effect.andThen(CommunitySlackChannelIds, Struct.get('shareAReview'))

export const layerChannelIds = (
  options: typeof CommunitySlackChannelIds.Service,
): Layer.Layer<CommunitySlackChannelIds> => Layer.succeed(CommunitySlackChannelIds, options)

export const layerChannelIdsConfig = (options: Config.Config.Wrap<Parameters<typeof layerChannelIds>[0]>) =>
  Layer.unwrapEffect(Effect.map(Config.unwrap(options), layerChannelIds))
