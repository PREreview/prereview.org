import { html } from '../src/html.js'
import { noPermissionPage } from '../src/http-error.js'
import { page as templatePage } from '../src/page.js'
import { expect, test } from './base.js'

test('no-permission page content looks right', async ({ page }) => {
  const pageHtml = templatePage({
    content: html` <main>${noPermissionPage.main}</main>`,
    title: noPermissionPage.title,
  })({})

  await page.setContent(pageHtml.toString())

  await expect(page.getByRole('main')).toHaveScreenshot()
})
