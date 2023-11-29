import { html, plainText } from '../src/html'
import { page as templatePage } from '../src/page'
import { partners } from '../src/partners'
import { expect, test } from './base'

test('main content looks right', async ({ page }) => {
  const partnersPage = partners

  const pageHtml = templatePage({
    content: html`<main>${partnersPage.main}</main>`,
    title: plainText('Something'),
  })({})

  await page.setContent(pageHtml.toString())

  await expect(page.getByRole('main')).toHaveScreenshot()
})
