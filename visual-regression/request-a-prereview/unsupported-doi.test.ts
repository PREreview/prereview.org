import { unsupportedDoiPage } from '../../src/request-a-prereview-page/unsupported-doi-page'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(unsupportedDoiPage)

  await expect(content).toHaveScreenshot()
})
