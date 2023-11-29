import { html, plainText } from '../src/html'
import { page as templatePage } from '../src/page'
import { expect, test } from './base'

test('page layout looks right', async ({ page }) => {
  const pageHtml = templatePage({
    content: html`<p id="main">hello</p>`,
    title: plainText('Something'),
  })({})

  await page.setContent(pageHtml.toString())

  await expect(page).toHaveScreenshot({ fullPage: true })
})
