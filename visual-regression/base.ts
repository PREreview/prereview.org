import { type Locator, test as baseTest } from '@playwright/test'
import path from 'path'
import { html, plainText } from '../src/html'
import { page as templatePage } from '../src/page'
import type { StreamlinePageResponse } from '../src/response'

export { expect } from '@playwright/test'

interface ShowPage {
  showPage: (response: StreamlinePageResponse) => Promise<{ nav: Locator; main: Locator }>
}

export const test = baseTest.extend<ShowPage>({
  page: async ({ page }, use) => {
    await page.route('**/*', (route, request) => {
      if (request.url() === 'http://example.com/') {
        return route.fulfill({ status: 200, headers: { 'Content-type': 'text/html; charset=utf-8' } })
      }
      if (request.url().startsWith('https://fonts.googleapis.com/')) {
        return route.fulfill({ status: 404 })
      }
      return route.fulfill({ path: path.join('dist/assets', new URL(request.url()).pathname) })
    })
    await page.goto('http://example.com')
    await use(page)
  },
  showPage: async ({ page }, use) => {
    await use(async function showPage(response) {
      const content = html`
        ${response.nav ? html` <nav data-testid="nav">${response.nav}</nav>` : ''}

        <main id="${response.skipToLabel}">${response.main}</main>
      `

      const pageHtml = templatePage({
        content,
        title: plainText('Something'),
      })({})

      await page.setContent(pageHtml.toString())

      return {
        nav: page.getByTestId('nav'),
        main: page.getByRole('main'),
      }
    })
  },
})
