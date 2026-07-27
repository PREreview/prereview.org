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
        title: html`<span>Review-a-thon (14–18 September, 2026)</span>`,
        description: html`<span>Gather your community to review preprints or datasets together and win a prize!</span>`,
        callToAction: {
          text: html`<span>Register your Club</span>`,
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
        title: html`<span>Matchmaking experiment</span>`,
        description: html`<span>Check out our experiment for suggestions about what to review next!</span>`,
        callToAction: {
          text: html`<span>Find preprints to review</span>`,
          url: new URL('https://matchmaking-experiment.prereview.org/'),
        },
        theme: 'product',
      }),
      js: ['spotlight-banner.js'],
    }),
  )

  await expect(content).toHaveScreenshot()
})
