import { html, plainText } from '../src/html.ts'
import { PageResponse } from '../src/WebApp/Response/index.ts'
import * as _ from '../src/WebApp/SpotlightBanner.ts'
import { expect, test } from './base.ts'

test('Community banner looks right', async ({ showPage }) => {
  const content = await showPage(
    PageResponse({
      title: plainText`Spotlight Banner`,
      main: _.showSpotlightBanner({
        id: '19ku1fGWddXyrFone7Pu62',
        title: plainText`Review-a-thon (14–18 September, 2026)`,
        description: html`Gather your community to review preprints or datasets together and win a prize!`,
        callToAction: {
          text: plainText`Register your Club`,
          url: new URL('https://prereview.org/clubs'),
        },
        theme: 'community',
      }),
      js: ['spotlight-banner.js'],
    }),
  )

  await expect(content).toHaveScreenshot()
})

test('Product banner looks right', async ({ showPage }) => {
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
        theme: 'product',
      }),
      js: ['spotlight-banner.js'],
    }),
  )

  await expect(content).toHaveScreenshot()
})
