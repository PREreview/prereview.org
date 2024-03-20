import { html, plainText } from '../src/html.js'
import { page as templatePage } from '../src/page.js'
import { partners } from '../src/partners.js'
import { expect, test } from './base.js'

test('main content looks right', async ({ page }) => {
  const partnersPage = partners

  const pageHtml = templatePage({
    content: html`<main>${partnersPage.main}</main>`,
    title: plainText('Something'),
  })({})

  await page.setContent(pageHtml.toString())

  await expect(page.getByRole('main')).toHaveScreenshot()
})
