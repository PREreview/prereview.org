import { unsupportedDoiPage } from '../../src/request-a-prereview-page/unsupported-doi-page.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(unsupportedDoiPage)

  await expect(content).toHaveScreenshot()
})
