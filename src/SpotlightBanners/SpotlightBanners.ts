import { Context, Effect, Layer } from 'effect'
import { html } from '../html.ts'
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
            title: html`<span lang="en" dir="ltr">Matchmaking experiment</span> `,
            description: html`<span lang="en" dir="ltr"
              >Check out our experiment for suggestions about what to review next!</span
            >`,
            callToAction: {
              text: html`<span lang="en" dir="ltr">Find preprints to review</span>`,
              url: new URL('https://matchmaking-experiment.prereview.org/'),
            },
            theme: 'product',
          }),
        ),
      }
    }),
  )
}
