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

export const canAddMultipleAuthors = Effect.fn(function* (
  ...args: Parameters<(typeof FeatureFlags.Service)['canAddMultipleAuthors']>
) {
  const featureFlags = yield* FeatureFlags

  return featureFlags.canAddMultipleAuthors(...args)
})

export const canChooseLocale = Effect.andThen(FeatureFlags, Struct.get('canChooseLocale'))

export const canSeeDesignTweaks = Effect.andThen(FeatureFlags, Struct.get('canSeeDesignTweaks'))

export const useCrowdinInContext = Effect.andThen(FeatureFlags, Struct.get('useCrowdinInContext'))

export const layer = (options: typeof FeatureFlags.Service): Layer.Layer<FeatureFlags> =>
  Layer.succeed(FeatureFlags, options)

export const layerConfig = (options: Config.Config.Wrap<Parameters<typeof layer>[0]>) =>
  Layer.unwrapEffect(Effect.map(Config.unwrap(options), layer))
