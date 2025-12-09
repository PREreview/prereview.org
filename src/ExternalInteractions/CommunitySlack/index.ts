import type { LanguageModel } from '@effect/ai'
import { Context, Effect, flow, Layer, Scope } from 'effect'
import type { Slack } from '../../ExternalApis/index.ts'
import type * as PublicUrl from '../../public-url.ts'
import type { CommunitySlackChannelIds } from './ChannelIds.js'
import { ShareDatasetReview } from './ShareDatasetReview/index.ts'
import { SharePreprintReview } from './SharePreprintReview/index.ts'
import { SharePreprintReviewRequest } from './SharePreprintReviewRequest/index.ts'

export * from './ChannelIds.ts'
export * from './legacy-slack.ts'
export { FailedToShareDatasetReview, type DatasetReview } from './ShareDatasetReview/index.ts'
export { FailedToSharePreprintReview, type PreprintReview } from './SharePreprintReview/index.ts'
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
    sharePreprintReview: (
      ...args: Parameters<typeof SharePreprintReview>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof SharePreprintReview>>,
      Effect.Effect.Error<ReturnType<typeof SharePreprintReview>>
    >
    sharePreprintReviewRequest: (
      ...args: Parameters<typeof SharePreprintReviewRequest>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof SharePreprintReviewRequest>>,
      Effect.Effect.Error<ReturnType<typeof SharePreprintReviewRequest>>,
      Scope.Scope
    >
  }
>() {}

export const { shareDatasetReview, sharePreprintReview, sharePreprintReviewRequest } =
  Effect.serviceFunctions(CommunitySlack)

export const make: Effect.Effect<
  typeof CommunitySlack.Service,
  never,
  CommunitySlackChannelIds | LanguageModel.LanguageModel | PublicUrl.PublicUrl | Slack.Slack
> = Effect.gen(function* () {
  const context = yield* Effect.andThen(
    Effect.context<CommunitySlackChannelIds | LanguageModel.LanguageModel | PublicUrl.PublicUrl | Slack.Slack>(),
    Context.omit(Scope.Scope),
  )

  return {
    shareDatasetReview: flow(ShareDatasetReview, Effect.provide(context)),
    sharePreprintReview: flow(SharePreprintReview, Effect.provide(context)),
    sharePreprintReviewRequest: flow(SharePreprintReviewRequest, Effect.provide(context)),
  }
})

export const layer = Layer.effect(CommunitySlack, make)
