import { unsupportedUrlPage } from '../../src/request-a-prereview-page/unsupported-url-page'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(unsupportedUrlPage)

  await expect(content).toHaveScreenshot()
})
