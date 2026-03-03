import { Config, Context, Data, Effect, Layer, Struct } from 'effect'
import type { User } from './user.ts'

export class FeatureFlags extends Context.Tag('FeatureFlags')<
  FeatureFlags,
  {
    canAddMultipleAuthors: (user?: User) => boolean
    canLogInAsDemoUser: boolean
    canSubscribeToReviewRequests: boolean
    sendCoarNotifyMessages: boolean | 'sandbox'
    useCrowdinInContext: boolean
  }
>() {}

const defaults = {
  canAddMultipleAuthors: () => false,
  canLogInAsDemoUser: false,
  canSubscribeToReviewRequests: false,
  sendCoarNotifyMessages: false,
  useCrowdinInContext: false,
} satisfies typeof FeatureFlags.Service

export const canAddMultipleAuthors = Effect.serviceFunction(FeatureFlags, Struct.get('canAddMultipleAuthors'))

export const { canLogInAsDemoUser, canSubscribeToReviewRequests, sendCoarNotifyMessages, useCrowdinInContext } =
  Effect.serviceConstants(FeatureFlags)

export class CannotLogInAsDemoUser extends Data.TaggedError('CannotLogInAsDemoUser') {}

export class CannotReviewDatasets extends Data.TaggedError('CannotReviewDatasets') {}

export class CannotSubscribeToReviewRequests extends Data.TaggedError('CannotSubscribeToReviewRequests') {}

export const EnsureCanLogInAsDemoUser = Effect.if(canLogInAsDemoUser, {
  onTrue: () => Effect.void,
  onFalse: () => new CannotLogInAsDemoUser(),
})

export const EnsureCanSubscribeToReviewRequests = Effect.if(canSubscribeToReviewRequests, {
  onTrue: () => Effect.void,
  onFalse: () => new CannotSubscribeToReviewRequests(),
})

export const layer = (options: Partial<typeof FeatureFlags.Service> = {}): Layer.Layer<FeatureFlags> =>
  Layer.succeed(FeatureFlags, { ...defaults, ...options })

export const layerDefaults: Layer.Layer<FeatureFlags> = layer()

export const layerConfig = (options: Config.Config.Wrap<Parameters<typeof layer>[0]>) =>
  Layer.unwrapEffect(Effect.map(Config.unwrap(options), layer))
