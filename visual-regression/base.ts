import { type Locator, test as baseTest, expect } from '@playwright/test'
import { HashSet, Match, String, pipe } from 'effect'
import * as fs from 'fs/promises'
import { HtmlValidate } from 'html-validate'
import path from 'path'
import type { Html } from '../src/html.ts'
import { DefaultLocale, type UserSelectableLocale } from '../src/locales/index.ts'
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
        Match.when(String.startsWith('https://res.cloudinary.com/prereview/'), () => route.continue()),
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
          isLoggedIn: false,
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
      const pageHtml = templatePage(toPage({ locale: DefaultLocale, isLoggedIn: false, response }))

      await showHtml(pageHtml)

      return [page.locator('.contents > main'), page.locator('.contents > aside')] as const
    })
  },
  showHtml: async ({ page }, use, testInfo) => {
    await use(async html => {
      const htmlValidate = new HtmlValidate({
        extends: ['html-validate:standard', 'html-validate:prettier'],
      })

      const report = await htmlValidate.validateString(html.toString())

      if (!report.valid) {
        const severity = ['', 'Warning', 'Error']

        let message = `${report.errorCount} error(s), ${report.warningCount} warning(s)\n`
        message += '─'.repeat(60)
        for (const result of report.results) {
          const lines = (result.source ?? '').split('\n')
          for (const resultMessage of result.messages) {
            const marker = resultMessage.size === 1 ? '▲' : '━'.repeat(resultMessage.size)
            message += '\n'
            message += `${severity[resultMessage.severity]} (${resultMessage.ruleId}): ${resultMessage.message}\n`
            message += `${resultMessage.ruleUrl}\n`
            message += `${lines[resultMessage.line - 1]}\n`
            message += `${' '.repeat(resultMessage.column - 1)}${marker}`
            message += '\n'
            message += '─'.repeat(60)
          }
        }

        message += `\n\nSource HTML:\n\n${html.toString()}`

        await fs.writeFile(testInfo.outputPath('invalid-html-report.txt'), message)
        await testInfo.attach('HTML validation report', { body: message, contentType: 'text/plain' })
      }
      await fs.writeFile(testInfo.outputPath('html-source.html'), html.toString())

      expect.soft(report.valid, 'HTML is invalid').toBe(true)

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
    await use(page =>
      templatePage({
        page,
        publicUrl: new URL(baseURL ?? ''),
        useCrowdinInContext: false,
        enabledLocales: HashSet.make<ReadonlyArray<UserSelectableLocale>>('en-US', 'es-419', 'pt-BR'),
      }),
    )
  },
})
