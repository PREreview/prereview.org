import { type Locator, test as baseTest } from '@playwright/test'
import path from 'path'
import { P, match } from 'ts-pattern'
import type { Html } from '../src/html.ts'
import { DefaultLocale } from '../src/locales/index.ts'
import { type Page, page as templatePage } from '../src/page.ts'
import { PageResponse, type StreamlinePageResponse, type TwoUpPageResponse, toPage } from '../src/Response/index.ts'

export { expect } from '@playwright/test'

interface ShowPage {
  showPage(
    response: PageResponse | StreamlinePageResponse,
    extra?: Omit<Partial<Parameters<typeof toPage>[0]>, 'response'>,
  ): Promise<Locator>

  showTwoUpPage(response: TwoUpPageResponse): Promise<[Locator, Locator]>

  showHtml(html: Html): Promise<void>

  templatePage(page: Page): Html
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

    await page.goto('http://example.com', { waitUntil: 'commit' })

    await use(page)
  },
  showPage: async ({ page, showHtml, templatePage }, use) => {
    await use(async function showPage(response, extra = {}) {
      const pageHtml = templatePage(
        toPage({
          locale: DefaultLocale,
          ...extra,
          response: PageResponse({
            title: response.title,
            main: response.main,
            nav: response.nav,
            js: response.js,
          }),
        }),
      )

      await showHtml(pageHtml)

      return page.locator('.contents')
    })
  },
  showTwoUpPage: async ({ page, showHtml, templatePage }, use) => {
    await use(async response => {
      const pageHtml = templatePage(toPage({ locale: DefaultLocale, response }))

      await showHtml(pageHtml)

      return [page.locator('.contents > main'), page.locator('.contents > aside')] as const
    })
  },
  showHtml: async ({ page }, use) => {
    await use(async html => {
      await page.setContent(html.toString())

      const viewportSize = page.viewportSize()

      if (viewportSize) {
        const height = await page.evaluate(() => document.documentElement.scrollHeight).then(Math.ceil)
        await page.setViewportSize({ width: viewportSize.width, height })
        await page.waitForLoadState('networkidle')
        await page.setViewportSize(viewportSize)
      }
    })
  },
  templatePage: async ({ baseURL }, use) => {
    await use(page => templatePage({ page, publicUrl: new URL(String(baseURL)), useCrowdinInContext: false }))
  },
})
