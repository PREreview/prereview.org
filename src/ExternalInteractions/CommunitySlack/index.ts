import { Context, Effect, flow, Layer } from 'effect'
import type { Slack } from '../../ExternalApis/index.ts'
import type { CommunitySlackChannelIds } from './ChannelIds.js'
import { ShareDatasetReview } from './ShareDatasetReview/index.ts'
import { SharePreprintReviewRequest } from './SharePreprintReviewRequest/index.ts'

export * from './ChannelIds.ts'
export * from './legacy-slack.ts'
export { FailedToShareDatasetReview, type DatasetReview } from './ShareDatasetReview/index.ts'
export { FailedToSharePreprintReviewRequest, type PreprintReviewRequest } from './SharePreprintReviewRequest/index.ts'
export * from './ShouldUpdateCommunitySlack.ts'

export class CommunitySlack extends Context.Tag('CommunitySlack')<
  CommunitySlack,
  {
    shareDatasetReview: (
      ...args: Parameters<typeof ShareDatasetReview>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof ShareDatasetReview>>,
      Effect.Effect.Error<ReturnType<typeof ShareDatasetReview>>
    >
    sharePreprintReviewRequest: (
      ...args: Parameters<typeof SharePreprintReviewRequest>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof SharePreprintReviewRequest>>,
      Effect.Effect.Error<ReturnType<typeof SharePreprintReviewRequest>>
    >
  }
>() {}

export const { shareDatasetReview, sharePreprintReviewRequest } = Effect.serviceFunctions(CommunitySlack)

export const make: Effect.Effect<typeof CommunitySlack.Service, never, CommunitySlackChannelIds | Slack.Slack> =
  Effect.gen(function* () {
    const context = yield* Effect.context<CommunitySlackChannelIds | Slack.Slack>()

    return {
      shareDatasetReview: flow(ShareDatasetReview, Effect.provide(context)),
      sharePreprintReviewRequest: flow(SharePreprintReviewRequest, Effect.provide(context)),
    }
  })

export const layer = Layer.effect(CommunitySlack, make)
