import { Config, Context, Data, Effect, Layer, Struct } from 'effect'
import type { User } from './user.ts'

export class FeatureFlags extends Context.Tag('FeatureFlags')<
  FeatureFlags,
  {
    canAddMultipleAuthors: (user?: User) => boolean
    canInviteOthersToDatasetReviews: boolean
    canLogInAsDemoUser: boolean
    canNotifyReviewsPublishedInResponseToRequests: boolean
    sendCoarNotifyMessages: boolean | 'sandbox'
    useCrowdinInContext: boolean
    showSpotlight: boolean
  }
>() {}

const defaults = {
  canAddMultipleAuthors: () => false,
  canInviteOthersToDatasetReviews: false,
  canLogInAsDemoUser: false,
  canNotifyReviewsPublishedInResponseToRequests: false,
  sendCoarNotifyMessages: false,
  useCrowdinInContext: false,
  showSpotlight: false,
} satisfies typeof FeatureFlags.Service

export const canAddMultipleAuthors = Effect.serviceFunction(FeatureFlags, Struct.get('canAddMultipleAuthors'))

export const {
  canInviteOthersToDatasetReviews,
  canLogInAsDemoUser,
  canNotifyReviewsPublishedInResponseToRequests,
  sendCoarNotifyMessages,
  useCrowdinInContext,
  showSpotlight,
} = Effect.serviceConstants(FeatureFlags)

export class CannotLogInAsDemoUser extends Data.TaggedError('CannotLogInAsDemoUser') {}

export const EnsureCanLogInAsDemoUser = Effect.if(canLogInAsDemoUser, {
  onTrue: () => Effect.void,
  onFalse: () => new CannotLogInAsDemoUser(),
})

export const layer = (options: Partial<typeof FeatureFlags.Service> = {}): Layer.Layer<FeatureFlags> =>
  Layer.succeed(FeatureFlags, { ...defaults, ...options })

export const layerDefaults: Layer.Layer<FeatureFlags> = layer()

export const layerConfig = (options: Config.Config.Wrap<Parameters<typeof layer>[0]>) =>
  Layer.unwrapEffect(Effect.map(Config.unwrap(options), layer))
