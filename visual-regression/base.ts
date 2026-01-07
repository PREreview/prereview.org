import { type Locator, test as baseTest } from '@playwright/test'
import { Match, String, pipe } from 'effect'
import path from 'path'
import type { Html } from '../src/html.ts'
import { DefaultLocale } from '../src/locales/index.ts'
import { type Page, page as templatePage } from '../src/WebApp/page.ts'
import {
  PageResponse,
  type StreamlinePageResponse,
  type TwoUpPageResponse,
  toPage,
} from '../src/WebApp/Response/index.ts'

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
    await page.route('**/*', (route, request) =>
      pipe(
        Match.value(request.url()),
        Match.when(String.startsWith('https://placehold.co/'), () => route.continue()),
        Match.when('http://example.com/', () =>
          route.fulfill({
            status: 200,
            headers: { 'Content-type': 'text/html; charset=utf-8' },
          }),
        ),
        Match.when(String.startsWith('https://fonts.googleapis.com/'), () => route.fulfill({ status: 404 })),
        Match.orElse(url => route.fulfill({ path: path.join('dist/assets', new URL(url).pathname) })),
      ),
    )

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
    await use(page => templatePage({ page, publicUrl: new URL(baseURL ?? ''), useCrowdinInContext: false }))
  },
})
