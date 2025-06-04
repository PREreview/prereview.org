import { Config, Context, Effect, Layer, Struct } from 'effect'
import type { User } from './user.js'

export class FeatureFlags extends Context.Tag('FeatureFlags')<
  FeatureFlags,
  {
    canAddMultipleAuthors: (user?: User) => boolean
    canChooseLocale: boolean
    canSeeDesignTweaks: boolean
    useCrowdinInContext: boolean
  }
>() {}

export const canAddMultipleAuthors = Effect.serviceFunction(FeatureFlags, Struct.get('canAddMultipleAuthors'))

export const { canChooseLocale, canSeeDesignTweaks, useCrowdinInContext } = Effect.serviceConstants(FeatureFlags)

export const layer = (options: typeof FeatureFlags.Service): Layer.Layer<FeatureFlags> =>
  Layer.succeed(FeatureFlags, options)

export const layerConfig = (options: Config.Config.Wrap<Parameters<typeof layer>[0]>) =>
  Layer.unwrapEffect(Effect.map(Config.unwrap(options), layer))
