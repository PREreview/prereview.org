import { DefaultLocale } from '../../src/locales/index.js'
import { unsupportedDoiPage } from '../../src/review-a-preprint-page/unsupported-doi-page.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(unsupportedDoiPage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
