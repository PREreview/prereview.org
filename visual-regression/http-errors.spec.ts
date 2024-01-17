import { html } from '../src/html'
import { noPermissionPage } from '../src/http-error'
import { page as templatePage } from '../src/page'
import { expect, test } from './base'

test('no-permission page content looks right', async ({ page }) => {
  const pageHtml = templatePage({
    content: html` <main>${noPermissionPage.main}</main>`,
    title: noPermissionPage.title,
  })({})

  await page.setContent(pageHtml.toString())

  await expect(page.getByRole('main')).toHaveScreenshot()
})
