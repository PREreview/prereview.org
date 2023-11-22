import { test as baseTest, expect } from '@playwright/test'
import path from 'path'
import { html, plainText } from '../src/html'
import { page as templatePage } from '../src/page'

const test = baseTest.extend({
  page: async ({ page }, use) => {
    await page.route('**/*', (route, request) => {
      if (request.url() === 'http://example.com/') {
        return route.fulfill({ status: 200, headers: { 'Content-type': 'text/html; charset=utf-8' } })
      }
      return route.fulfill({ path: path.join('dist/assets', new URL(request.url()).pathname) })
    })
    await page.goto('http://example.com')
    await use(page)
  },
})

test('skip-link', async ({ page }) => {
  const pageHtml = templatePage({
    content: html`<p id="main">hello</p>`,
    title: plainText('Something'),
    skipLinks: [[html`Skip to main content`, '#main']],
  })({})

  await page.setContent(pageHtml.toString())
  await page.keyboard.press('Tab')

  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
  await expect(page).toHaveScreenshot()
})
