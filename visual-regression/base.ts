import { type Locator, test as baseTest } from '@playwright/test'
import path from 'path'
import { P, match } from 'ts-pattern'
import { html } from '../src/html'
import { page as templatePage } from '../src/page'
import type { PageResponse, StreamlinePageResponse } from '../src/response'

export { expect } from '@playwright/test'

interface ShowPage {
  showPage: (response: PageResponse | StreamlinePageResponse) => Promise<Locator>
}

export const test = baseTest.extend<ShowPage>({
  page: async ({ page }, use) => {
    await page.route('**/*', (route, request) => {
      return match(request.url())
        .with(P.string.startsWith('https://placehold.co/'), () => route.continue())
        .with('http://example.com/', () =>
          route.fulfill({
            status: 200,
            headers: { 'Content-type': 'text/html; charset=utf-8' },
          }),
        )
        .with(P.string.startsWith('https://fonts.googleapis.com/'), () => route.fulfill({ status: 404 }))
        .otherwise(url => route.fulfill({ path: path.join('dist/assets', new URL(url).pathname) }))
    })

    await page.goto('http://example.com')

    await use(page)
  },
  showPage: async ({ page }, use) => {
    await use(async function showPage(response) {
      const content = html`
        ${response.nav ? html` <nav>${response.nav}</nav>` : ''}

        <main id="${response.skipToLabel}">${response.main}</main>
      `

      const pageHtml = templatePage({
        content,
        title: response.title,
        js: response.js,
      })({})

      await page.setContent(pageHtml.toString())

      return page.locator('.contents')
    })
  },
})
