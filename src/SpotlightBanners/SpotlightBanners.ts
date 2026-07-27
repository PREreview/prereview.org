import { Context, Effect, Layer, Scope } from 'effect'
import type { Locale } from '../Context.ts'
import type { Contentful } from '../ExternalApis/Contentful/index.ts'
import { GetCurrentBanner } from './GetCurrentBanner/index.ts'

export class SpotlightBanners extends Context.Tag('SpotlightBanners')<
  SpotlightBanners,
  {
    getCurrentBanner: Effect.Effect<
      Effect.Effect.Success<typeof GetCurrentBanner>,
      Effect.Effect.Error<typeof GetCurrentBanner>,
      Locale
    >
  }
>() {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const context = yield* Effect.andThen(Effect.context<Contentful>(), Context.omit(Scope.Scope))

      return {
        getCurrentBanner: Effect.provide(GetCurrentBanner, context),
      }
    }),
  )
}
