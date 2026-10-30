import { Config, Context, Data, Effect, Layer } from 'effect'
import type { Clubs } from './Clubs/index.ts'
import type { User } from './user.ts'

export class FeatureFlags extends Context.Tag('FeatureFlags')<
  FeatureFlags,
  {
    canAddMultipleAuthors: (user?: User) => Effect.Effect<boolean, never, Clubs>
    canClubLeadsAddReviewsToClubs: boolean
    canLogInAsDemoUser: boolean
    canPreviewContentFromContentful: boolean
    canUseMatchmaking: (user?: User) => boolean
    loadPagesFromContentful: boolean
    loadBlogFromContentful: boolean
    sendCoarNotifyMessages: boolean | 'sandbox'
    useCrowdinInContext: boolean
    showSpotlight: boolean
  }
>() {}

const defaults = {
  canAddMultipleAuthors: () => Effect.succeed(false),
  canClubLeadsAddReviewsToClubs: false,
  canLogInAsDemoUser: false,
  canPreviewContentFromContentful: false,
  canUseMatchmaking: () => false,
  loadBlogFromContentful: false,
  loadPagesFromContentful: false,
  sendCoarNotifyMessages: false,
  useCrowdinInContext: false,
  showSpotlight: false,
} satisfies typeof FeatureFlags.Service

export const canAddMultipleAuthors = (user?: User) =>
  Effect.flatMap(FeatureFlags, service => service.canAddMultipleAuthors(user))

export const canLogInAsDemoUser = Effect.map(FeatureFlags, service => service.canLogInAsDemoUser)

export const canClubLeadsAddReviewsToClubs = Effect.map(FeatureFlags, service => service.canClubLeadsAddReviewsToClubs)

export const canPreviewContentFromContentful = Effect.map(
  FeatureFlags,
  service => service.canPreviewContentFromContentful,
)

export const loadBlogFromContentful = Effect.map(FeatureFlags, service => service.loadBlogFromContentful)

export const loadPagesFromContentful = Effect.map(FeatureFlags, service => service.loadPagesFromContentful)

export const sendCoarNotifyMessages = Effect.map(FeatureFlags, service => service.sendCoarNotifyMessages)

export const useCrowdinInContext = Effect.map(FeatureFlags, service => service.useCrowdinInContext)

export const showSpotlight = Effect.map(FeatureFlags, service => service.showSpotlight)

export class CannotLogInAsDemoUser extends Data.TaggedError('CannotLogInAsDemoUser') {}

export const EnsureCanLogInAsDemoUser = Effect.flatMap(canLogInAsDemoUser, condition =>
  condition ? Effect.void : new CannotLogInAsDemoUser(),
)

export const layer = (options: Partial<typeof FeatureFlags.Service> = {}): Layer.Layer<FeatureFlags> =>
  Layer.succeed(FeatureFlags, { ...defaults, ...options })

export const layerDefaults: Layer.Layer<FeatureFlags> = layer()

export const layerConfig = (options: Config.Config.Wrap<Parameters<typeof layer>[0]>) =>
  Layer.unwrapEffect(Effect.map(Config.unwrap(options), layer))
