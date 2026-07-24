import { Context, Effect, Layer } from 'effect'
import { html, plainText } from '../html.ts'
import type { GetCurrentBanner } from './GetCurrentBanner/index.ts'
import { SpotlightBanner } from './Types.ts'

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
        getCurrentBanner: Effect.succeedSome(
          new SpotlightBanner({
            id: '19ku1fGWddXyrFone7Pu62',
            title: plainText`Matchmaking experiment`,
            description: html`Check out our experiment for suggestions about what to review next!`,
            callToAction: {
              text: plainText`Find preprints to review`,
              url: new URL('https://matchmaking-experiment.prereview.org/'),
            },
          }),
        ),
      }
    }),
  )
}
