import { type Locator, test as baseTest } from '@playwright/test'
import path from 'path'
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
      if (request.url().startsWith('https://placehold.co/')) {
        return route.continue()
      }
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
