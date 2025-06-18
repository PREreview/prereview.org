import { Config, Context, Data, Effect, Layer, Struct } from 'effect'
import type { User } from './user.js'

export class FeatureFlags extends Context.Tag('FeatureFlags')<
  FeatureFlags,
  {
    canAddMultipleAuthors: (user?: User) => boolean
    canChooseLocale: boolean
    canReviewDatasets: boolean
    canSeeDesignTweaks: boolean
    canSeeHomePageChanges: (user?: User) => boolean
    useCrowdinInContext: boolean
  }
>() {}

export const canAddMultipleAuthors = Effect.serviceFunction(FeatureFlags, Struct.get('canAddMultipleAuthors'))

export const canSeeHomePageChanges = Effect.serviceFunction(FeatureFlags, Struct.get('canSeeHomePageChanges'))

export const { canChooseLocale, canReviewDatasets, canSeeDesignTweaks, useCrowdinInContext } =
  Effect.serviceConstants(FeatureFlags)

export class CannotChooseLocale extends Data.TaggedError('CannotChooseLocale') {}

export class CannotReviewDatasets extends Data.TaggedError('CannotReviewDatasets') {}

export const EnsureCanChooseLocale = Effect.if(canChooseLocale, {
  onTrue: () => Effect.void,
  onFalse: () => new CannotChooseLocale(),
})

export const EnsureCanReviewDatasets = Effect.if(canReviewDatasets, {
  onTrue: () => Effect.void,
  onFalse: () => new CannotReviewDatasets(),
})

export const layer = (options: typeof FeatureFlags.Service): Layer.Layer<FeatureFlags> =>
  Layer.succeed(FeatureFlags, options)

export const layerConfig = (options: Config.Config.Wrap<Parameters<typeof layer>[0]>) =>
  Layer.unwrapEffect(Effect.map(Config.unwrap(options), layer))
