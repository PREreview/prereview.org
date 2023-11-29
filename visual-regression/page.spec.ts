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

test('page layout looks right', async ({ page }) => {
  const pageHtml = templatePage({
    content: html`<p id="main">hello</p>`,
    title: plainText('Something'),
  })({})

  await page.setContent(pageHtml.toString())

  await expect(page).toHaveScreenshot({ fullPage: true })
})
