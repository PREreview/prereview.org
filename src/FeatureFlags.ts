import { Config, Context, Data, Effect, Layer } from 'effect'
import type { Clubs } from './Clubs/index.ts'
import type { User } from './user.ts'

export class FeatureFlags extends Context.Service<
  FeatureFlags,
  {
    canAddMultipleAuthors: (user?: User) => Effect.Effect<boolean, never, Clubs>
    canClubLeadsAddReviewsToClubs: boolean
    canLogInAsDemoUser: boolean
    canPreviewContentFromContentful: boolean
    canUseMatchmaking: (user?: User) => boolean
    useEventsForPreprintReviews: boolean
    loadPagesFromContentful: boolean
    loadBlogFromContentful: boolean
    sendCoarNotifyMessages: boolean | 'sandbox'
    useCrowdinInContext: boolean
    showSpotlight: boolean
  }
>()('FeatureFlags') {}

const defaults = {
  canAddMultipleAuthors: () => Effect.succeed(false),
  canClubLeadsAddReviewsToClubs: false,
  canLogInAsDemoUser: false,
  canPreviewContentFromContentful: false,
  canUseMatchmaking: () => false,
  useEventsForPreprintReviews: false,
  loadBlogFromContentful: false,
  loadPagesFromContentful: false,
  sendCoarNotifyMessages: false,
  useCrowdinInContext: false,
  showSpotlight: false,
} satisfies typeof FeatureFlags.Service

export const canAddMultipleAuthors = (user?: User) => FeatureFlags.use(service => service.canAddMultipleAuthors(user))

export const canLogInAsDemoUser = FeatureFlags.useSync(service => service.canLogInAsDemoUser)

export const canClubLeadsAddReviewsToClubs = FeatureFlags.useSync(service => service.canClubLeadsAddReviewsToClubs)

export const canPreviewContentFromContentful = FeatureFlags.useSync(service => service.canPreviewContentFromContentful)

export const loadBlogFromContentful = FeatureFlags.useSync(service => service.loadBlogFromContentful)

export const loadPagesFromContentful = FeatureFlags.useSync(service => service.loadPagesFromContentful)

export const sendCoarNotifyMessages = FeatureFlags.useSync(service => service.sendCoarNotifyMessages)

export const useCrowdinInContext = FeatureFlags.useSync(service => service.useCrowdinInContext)

export const showSpotlight = FeatureFlags.useSync(service => service.showSpotlight)

export class CannotLogInAsDemoUser extends Data.TaggedError('CannotLogInAsDemoUser') {}

export const EnsureCanLogInAsDemoUser = Effect.flatMap(canLogInAsDemoUser, condition =>
  condition ? Effect.void : new CannotLogInAsDemoUser(),
)

export const layer = (options: Partial<typeof FeatureFlags.Service> = {}): Layer.Layer<FeatureFlags> =>
  Layer.succeed(FeatureFlags, { ...defaults, ...options })

export const layerDefaults: Layer.Layer<FeatureFlags> = layer()

export const layerConfig = (options: Config.Wrap<Parameters<typeof layer>[0]>) =>
  Layer.unwrap(Effect.map(Config.unwrap(options), layer))
