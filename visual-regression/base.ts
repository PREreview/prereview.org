import { test as baseTest } from '@playwright/test'
import path from 'path'

export { expect } from '@playwright/test'

export const test = baseTest.extend({
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
})
