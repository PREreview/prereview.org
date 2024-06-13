import { unsupportedUrlPage } from '../../src/review-a-preprint-page/unsupported-url-page.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(unsupportedUrlPage)

  await expect(content).toHaveScreenshot()
})
