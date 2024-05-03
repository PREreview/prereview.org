import { unsupportedUrlPage } from '../../src/review-a-preprint-page/unsupported-url-page'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(unsupportedUrlPage)

  await expect(content).toHaveScreenshot()
})
