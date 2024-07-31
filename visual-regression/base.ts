import { type Locator, test as baseTest } from '@playwright/test'
import path from 'path'
import { P, match } from 'ts-pattern'
import { type Html, html } from '../src/html.js'
import { DefaultLocale } from '../src/locales/index.js'
import { type Page, page as templatePage } from '../src/page.js'
import type { PageResponse, StreamlinePageResponse, TwoUpPageResponse } from '../src/response.js'

export { expect } from '@playwright/test'

interface ShowPage {
  showPage(
    response: PageResponse | StreamlinePageResponse,
    extra?: Pick<Page, 'skipLinks' | 'user' | 'userOnboarding'>,
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

    await page.goto('http://example.com')

    await use(page)
  },
  showPage: async ({ page, showHtml, templatePage }, use) => {
    await use(async function showPage(response, extra = {}) {
      const content = html`
        ${response.nav
          ? html` <nav>${typeof response.nav === 'function' ? response.nav(DefaultLocale) : response.nav}</nav>`
          : ''}

        <main id="${response.skipToLabel}">
          ${typeof response.main === 'function' ? response.main(DefaultLocale) : response.main}
        </main>
      `

      const pageHtml = templatePage({
        ...extra,
        content,
        title: typeof response.title === 'function' ? response.title(DefaultLocale) : response.title,
        js: response.js,
      })

      await showHtml(pageHtml)

      return page.locator('.contents')
    })
  },
  showTwoUpPage: async ({ page, showHtml, templatePage }, use) => {
    await use(async response => {
      const content = html`
        <h1 class="visually-hidden">${typeof response.h1 === 'function' ? response.h1(DefaultLocale) : response.h1}</h1>

        <aside id="preprint-details" tabindex="0" aria-label="Preprint details">
          ${typeof response.aside === 'function' ? response.aside(DefaultLocale) : response.aside}
        </aside>

        <main id="prereviews">
          ${typeof response.main === 'function' ? response.main(DefaultLocale) : response.main}
        </main>
      `

      const pageHtml = templatePage({
        content,
        title: typeof response.title === 'function' ? response.title(DefaultLocale) : response.title,
        type: 'two-up',
      })

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
    await use(page => templatePage(page)({ publicUrl: new URL(String(baseURL)) }))
  },
})
