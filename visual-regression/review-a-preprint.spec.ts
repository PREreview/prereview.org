import * as TE from 'fp-ts/TaskEither'
import { html, plainText } from '../src/html'
import { page as templatePage } from '../src/page'
import { reviewAPreprint } from '../src/review-a-preprint'
import { expect, test } from './base'

test('content looks right', async ({ page }) => {
  const response = await reviewAPreprint({ method: 'GET', body: undefined })({
    doesPreprintExist: () => TE.left('unavailable'),
  })()

  if (response._tag !== 'PageResponse') {
    throw new Error('incorrect page response')
  }

  const content = html`
    ${response.nav ? html` <nav data-testid="nav">${response.nav}</nav>` : ''}

    <main id="${response.skipToLabel}">${response.main}</main>
  `

  const pageHtml = templatePage({
    content,
    title: plainText('Something'),
  })({})

  await page.setContent(pageHtml.toString())

  await expect(page.getByTestId('nav')).toHaveScreenshot()
  await expect(page.getByRole('main')).toHaveScreenshot()
})
