import { Context, Effect, Layer } from 'effect'
import { UnableToQuery } from '../Queries.ts'
import type { GetCurrentBanner } from './GetCurrentBanner/index.ts'

export class SpotlightBanners extends Context.Tag('SpotlightBanners')<
  SpotlightBanners,
  {
    getCurrentBanner: Effect.Effect<
      Effect.Effect.Success<typeof GetCurrentBanner>,
      Effect.Effect.Error<typeof GetCurrentBanner>
    >
  }
>() {
  static readonly layer = Layer.effect(
    this,
    Effect.sync(() => {
      return {
        getCurrentBanner: new UnableToQuery({ cause: 'not implemented' }),
      }
    }),
  )
}
