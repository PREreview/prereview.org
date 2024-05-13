import { type Locator, test as baseTest } from '@playwright/test'
import path from 'path'
import { P, match } from 'ts-pattern'
import { html } from '../src/html'
import { type Page, page as templatePage } from '../src/page'
import type { PageResponse, StreamlinePageResponse, TwoUpPageResponse } from '../src/response'

export { expect } from '@playwright/test'

interface ShowPage {
  showPage(
    response: PageResponse | StreamlinePageResponse,
    extra?: Pick<Page, 'skipLinks' | 'user' | 'userOnboarding'>,
  ): Promise<Locator>

  showTwoUpPage(response: TwoUpPageResponse): Promise<[Locator, Locator]>
}

export const test = baseTest.extend<ShowPage>({
  baseURL: async ({}, use) => {
    await use('http://example.com')
  },
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
  showPage: async ({ baseURL, page }, use) => {
    await use(async function showPage(response, extra = {}) {
      const content = html`
        ${response.nav ? html` <nav>${response.nav}</nav>` : ''}

        <main id="${response.skipToLabel}">${response.main}</main>
      `

      const pageHtml = templatePage({
        ...extra,
        content,
        title: response.title,
        js: response.js,
      })({ publicUrl: new URL(String(baseURL)) })

      await page.setContent(pageHtml.toString())

      const viewportSize = page.viewportSize()

      if (viewportSize) {
        const height = await page.evaluate(() => document.documentElement.scrollHeight).then(Math.ceil)
        await page.setViewportSize({ width: viewportSize.width, height })
        await page.waitForLoadState('networkidle')
        await page.setViewportSize(viewportSize)
      }

      return page.locator('.contents')
    })
  },
  showTwoUpPage: async ({ baseURL, page }, use) => {
    await use(async response => {
      const content = html`
        <h1 class="visually-hidden">${response.h1}</h1>

        <aside id="preprint-details" tabindex="0" aria-label="Preprint details">${response.aside}</aside>

        <main id="prereviews">${response.main}</main>
      `

      const pageHtml = templatePage({
        content,
        title: response.title,
        type: 'two-up',
      })({ publicUrl: new URL(String(baseURL)) })

      await page.setContent(pageHtml.toString())

      const viewportSize = page.viewportSize()

      if (viewportSize) {
        const height = await page.evaluate(() => document.documentElement.scrollHeight).then(Math.ceil)
        await page.setViewportSize({ width: viewportSize.width, height })
        await page.waitForLoadState('networkidle')
        await page.setViewportSize(viewportSize)
      }

      return [page.locator('.contents > main'), page.locator('.contents > aside')] as const
    })
  },
})
