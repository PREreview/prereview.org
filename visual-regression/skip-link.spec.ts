import { expect, test } from '../integration/base'
import { html, plainText } from '../src/html'
import { page as templatePage } from '../src/page'

test('skip-link', async ({ page }) => {
  await page.goto('/')

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
