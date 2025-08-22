import { Config, Context, Data, Effect, Layer, Struct } from 'effect'
import type { User } from './user.js'

export class FeatureFlags extends Context.Tag('FeatureFlags')<
  FeatureFlags,
  {
    aiReviewsAsCc0: (user?: User) => boolean
    askAiReviewEarly: (user?: User) => boolean
    canAddMultipleAuthors: (user?: User) => boolean
    canLogInAsDemoUser: boolean
    canReviewDatasets: boolean
    useCrowdinInContext: boolean
  }
>() {}

export const aiReviewsAsCc0 = Effect.serviceFunction(FeatureFlags, Struct.get('aiReviewsAsCc0'))

export const askAiReviewEarly = Effect.serviceFunction(FeatureFlags, Struct.get('aiReviewsAsCc0'))

export const canAddMultipleAuthors = Effect.serviceFunction(FeatureFlags, Struct.get('canAddMultipleAuthors'))

export const { canLogInAsDemoUser, canReviewDatasets, useCrowdinInContext } = Effect.serviceConstants(FeatureFlags)

export class CannotLogInAsDemoUser extends Data.TaggedError('CannotLogInAsDemoUser') {}

export class CannotReviewDatasets extends Data.TaggedError('CannotReviewDatasets') {}

export const EnsureCanLogInAsDemoUser = Effect.if(canLogInAsDemoUser, {
  onTrue: () => Effect.void,
  onFalse: () => new CannotLogInAsDemoUser(),
})

export const EnsureCanReviewDatasets = Effect.if(canReviewDatasets, {
  onTrue: () => Effect.void,
  onFalse: () => new CannotReviewDatasets(),
})

export const layer = (options: typeof FeatureFlags.Service): Layer.Layer<FeatureFlags> =>
  Layer.succeed(FeatureFlags, options)

export const layerConfig = (options: Config.Config.Wrap<Parameters<typeof layer>[0]>) =>
  Layer.unwrapEffect(Effect.map(Config.unwrap(options), layer))
