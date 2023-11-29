import { html, plainText } from '../src/html'
import { page as templatePage } from '../src/page'
import { expect, test } from './base'

test('visibly hidden when not focussed', async ({ page }) => {
  const pageHtml = templatePage({
    content: html`<p id="main">hello</p>`,
    title: plainText('Something'),
    skipLinks: [[html`Skip to main content`, '#main']],
  })({})

  await page.setContent(pageHtml.toString())

  const skipLink = page.getByRole('link', { name: 'Skip to main content' })

  await expect(skipLink.boundingBox()).resolves.toMatchObject({ height: 1, width: 1 })

  await page.keyboard.press('Tab')

  await expect(skipLink).toBeFocused()
  await expect(page).toHaveScreenshot()
})
