import type { LanguageModel } from '@effect/ai'
import { Context, Effect, flow, Layer, Scope } from 'effect'
import type { Slack } from '../../ExternalApis/index.ts'
import type * as PublicUrl from '../../public-url.ts'
import type { CommunitySlackChannelIds } from './ChannelIds.ts'
import { GetSlackUser } from './GetSlackUser/index.ts'
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
    getSlackUser: (
      ...args: Parameters<typeof GetSlackUser>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof GetSlackUser>>,
      Effect.Effect.Error<ReturnType<typeof GetSlackUser>>
    >
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

export const getSlackUser = (...args: Parameters<(typeof CommunitySlack.Service)['getSlackUser']>) =>
  Effect.flatMap(CommunitySlack, service => service.getSlackUser(...args))

export const shareDatasetReview = (...args: Parameters<(typeof CommunitySlack.Service)['shareDatasetReview']>) =>
  Effect.flatMap(CommunitySlack, service => service.shareDatasetReview(...args))

export const sharePreprintReview = (...args: Parameters<(typeof CommunitySlack.Service)['sharePreprintReview']>) =>
  Effect.flatMap(CommunitySlack, service => service.sharePreprintReview(...args))

export const sharePreprintReviewRequest = (
  ...args: Parameters<(typeof CommunitySlack.Service)['sharePreprintReviewRequest']>
) => Effect.flatMap(CommunitySlack, service => service.sharePreprintReviewRequest(...args))

export const make: Effect.Effect<
  typeof CommunitySlack.Service,
  never,
  CommunitySlackChannelIds | LanguageModel.LanguageModel | PublicUrl.PublicUrl | Slack.Slack
> = Effect.gen(function* () {
  const context = yield* Effect.map(
    Effect.context<CommunitySlackChannelIds | LanguageModel.LanguageModel | PublicUrl.PublicUrl | Slack.Slack>(),
    Context.omit(Scope.Scope),
  )

  return {
    getSlackUser: flow(GetSlackUser, Effect.provide(context)),
    shareDatasetReview: flow(ShareDatasetReview, Effect.provide(context)),
    sharePreprintReview: flow(SharePreprintReview, Effect.provide(context)),
    sharePreprintReviewRequest: flow(SharePreprintReviewRequest, Effect.provide(context)),
  }
})

export const layer = Layer.effect(CommunitySlack, make)
