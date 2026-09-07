import { Context, Effect, flow, Layer, Scope } from 'effect'
import type { Locale } from '../Context.ts'
import type { Contentful } from '../ExternalApis/Contentful/index.ts'
import { GetCurrentBanner } from './GetCurrentBanner/index.ts'
import { PreviewBanner } from './PreviewBanner/index.ts'

export class SpotlightBanners extends Context.Tag('SpotlightBanners')<
  SpotlightBanners,
  {
    getCurrentBanner: Effect.Effect<
      Effect.Effect.Success<typeof GetCurrentBanner>,
      Effect.Effect.Error<typeof GetCurrentBanner>,
      Locale
    >
    previewBanner: (
      ...args: Parameters<typeof PreviewBanner>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof PreviewBanner>>,
      Effect.Effect.Error<ReturnType<typeof PreviewBanner>>,
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
        previewBanner: flow(PreviewBanner, Effect.provide(context)),
      }
    }),
  )
}
