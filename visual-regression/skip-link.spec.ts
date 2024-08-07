import { html, plainText } from '../src/html.js'
import { PageResponse } from '../src/response.js'
import { expect, test } from './base.js'

test('visibly hidden when not focussed', async ({ showPage }) => {
  const response = PageResponse({
    main: html`<p>hello</p>`,
    title: plainText('Something'),
  })

  const content = await showPage(response)
  const page = content.page()

  const skipLink = page.getByRole('link', { name: 'Skip to main content' })

  await expect(skipLink.boundingBox()).resolves.toMatchObject({ height: 1, width: 1 })

  await page.keyboard.press('Tab')

  await expect(skipLink).toBeFocused()
  await expect(page).toHaveScreenshot()
})
