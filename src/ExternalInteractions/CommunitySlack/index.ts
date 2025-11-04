import { Context, Effect, flow, Layer } from 'effect'
import type { Slack } from '../../ExternalApis/index.ts'
import type { CommunitySlackChannelIds } from './ChannelIds.js'
import { ShareDatasetReview } from './ShareDatasetReview/index.ts'

export * from './ChannelIds.ts'
export { FailedToShareDatasetReview, type DatasetReview } from './ShareDatasetReview/index.ts'

export class CommunitySlack extends Context.Tag('CommunitySlack')<
  CommunitySlack,
  {
    shareDatasetReview: (
      ...args: Parameters<typeof ShareDatasetReview>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof ShareDatasetReview>>,
      Effect.Effect.Error<ReturnType<typeof ShareDatasetReview>>
    >
  }
>() {}

export const { shareDatasetReview } = Effect.serviceFunctions(CommunitySlack)

export const make: Effect.Effect<typeof CommunitySlack.Service, never, CommunitySlackChannelIds | Slack.Slack> =
  Effect.gen(function* () {
    const context = yield* Effect.context<CommunitySlackChannelIds | Slack.Slack>()

    return {
      shareDatasetReview: flow(ShareDatasetReview, Effect.provide(context)),
    }
  })

export const layer = Layer.effect(CommunitySlack, make)
