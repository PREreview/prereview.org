import { html, plainText } from '../src/html.ts'
import { PageResponse } from '../src/WebApp/Response/index.ts'
import * as _ from '../src/WebApp/SpotlightBanner.ts'
import { expect, test } from './base.ts'

test('banner looks right', async ({ showPage }) => {
  const content = await showPage(
    PageResponse({
      title: plainText`Spotlight Banner`,
      main: _.showSpotlightBanner({
        id: '19ku1fGWddXyrFone7Pu62',
        title: plainText`Matchmaking experiment`,
        description: html`Check out our experiment for suggestions about what to review next!`,
        callToAction: {
          text: plainText`Find preprints to review`,
          url: new URL('https://matchmaking-experiment.prereview.org/'),
        },
      }),
      js: ['spotlight-banner.js'],
    }),
  )

  await expect(content).toHaveScreenshot()
})
