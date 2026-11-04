import type { LanguageModel } from 'effect/ai'
import { Context, Effect, flow, Layer, Scope } from 'effect'
import type { Slack } from '../../ExternalApis/index.ts'
import type * as PublicUrl from '../../public-url.ts'
import { AddOrcidToSlackProfile } from './AddOrcidToSlackProfile/index.ts'
import type { CommunitySlackChannelIds } from './ChannelIds.ts'
import { GetSlackUser } from './GetSlackUser/index.ts'
import { RemoveOrcidFromSlackProfile } from './RemoveOrcidFromSlackProfile/index.ts'
import { ShareDatasetReview } from './ShareDatasetReview/index.ts'
import { SharePreprintReview } from './SharePreprintReview/index.ts'
import { SharePreprintReviewRequest } from './SharePreprintReviewRequest/index.ts'
import type { ShouldUpdateCommunitySlack } from './ShouldUpdateCommunitySlack.ts'

export { FailedToAddOrcidToSlackProfile } from './AddOrcidToSlackProfile/index.ts'
export * from './ChannelIds.ts'
export * from './legacy-slack.ts'
export { FailedToRemoveOrcidFromSlackProfile } from './RemoveOrcidFromSlackProfile/index.ts'
export { FailedToShareDatasetReview, type DatasetReview } from './ShareDatasetReview/index.ts'
export { FailedToSharePreprintReview, type PreprintReview } from './SharePreprintReview/index.ts'
export { FailedToSharePreprintReviewRequest, type PreprintReviewRequest } from './SharePreprintReviewRequest/index.ts'
export * from './ShouldUpdateCommunitySlack.ts'

export class CommunitySlack extends Context.Service<
  CommunitySlack,
  {
    addOrcidToSlackProfile: (
      ...args: Parameters<typeof AddOrcidToSlackProfile>
    ) => Effect.Effect<
      Effect.Success<ReturnType<typeof AddOrcidToSlackProfile>>,
      Effect.Error<ReturnType<typeof AddOrcidToSlackProfile>>
    >
    getSlackUser: (
      ...args: Parameters<typeof GetSlackUser>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof GetSlackUser>>, Effect.Error<ReturnType<typeof GetSlackUser>>>
    removeOrcidFromSlackProfile: (
      ...args: Parameters<typeof RemoveOrcidFromSlackProfile>
    ) => Effect.Effect<
      Effect.Success<ReturnType<typeof RemoveOrcidFromSlackProfile>>,
      Effect.Error<ReturnType<typeof RemoveOrcidFromSlackProfile>>
    >
    shareDatasetReview: (
      ...args: Parameters<typeof ShareDatasetReview>
    ) => Effect.Effect<
      Effect.Success<ReturnType<typeof ShareDatasetReview>>,
      Effect.Error<ReturnType<typeof ShareDatasetReview>>
    >
    sharePreprintReview: (
      ...args: Parameters<typeof SharePreprintReview>
    ) => Effect.Effect<
      Effect.Success<ReturnType<typeof SharePreprintReview>>,
      Effect.Error<ReturnType<typeof SharePreprintReview>>
    >
    sharePreprintReviewRequest: (
      ...args: Parameters<typeof SharePreprintReviewRequest>
    ) => Effect.Effect<
      Effect.Success<ReturnType<typeof SharePreprintReviewRequest>>,
      Effect.Error<ReturnType<typeof SharePreprintReviewRequest>>,
      Scope.Scope
    >
  }
>()('CommunitySlack') {}

export const getSlackUser = (...args: Parameters<(typeof CommunitySlack.Service)['getSlackUser']>) =>
  CommunitySlack.use(service => service.getSlackUser(...args))

export const shareDatasetReview = (...args: Parameters<(typeof CommunitySlack.Service)['shareDatasetReview']>) =>
  CommunitySlack.use(service => service.shareDatasetReview(...args))

export const sharePreprintReview = (...args: Parameters<(typeof CommunitySlack.Service)['sharePreprintReview']>) =>
  CommunitySlack.use(service => service.sharePreprintReview(...args))

export const sharePreprintReviewRequest = (
  ...args: Parameters<(typeof CommunitySlack.Service)['sharePreprintReviewRequest']>
) => CommunitySlack.use(service => service.sharePreprintReviewRequest(...args))

export const make: Effect.Effect<
  typeof CommunitySlack.Service,
  never,
  | CommunitySlackChannelIds
  | LanguageModel.LanguageModel
  | PublicUrl.PublicUrl
  | ShouldUpdateCommunitySlack
  | Slack.Slack
> = Effect.gen(function* () {
  const context = yield* Effect.map(
    Effect.context<
      | CommunitySlackChannelIds
      | LanguageModel.LanguageModel
      | PublicUrl.PublicUrl
      | ShouldUpdateCommunitySlack
      | Slack.Slack
    >(),
    Context.omit(Scope.Scope),
  )

  return {
    addOrcidToSlackProfile: flow(AddOrcidToSlackProfile, Effect.provide(context)),
    getSlackUser: flow(GetSlackUser, Effect.provide(context)),
    removeOrcidFromSlackProfile: flow(RemoveOrcidFromSlackProfile, Effect.provide(context)),
    shareDatasetReview: flow(ShareDatasetReview, Effect.provide(context)),
    sharePreprintReview: flow(SharePreprintReview, Effect.provide(context)),
    sharePreprintReviewRequest: flow(SharePreprintReviewRequest, Effect.provide(context)),
  }
})

export const layer = Layer.effect(CommunitySlack, make)
