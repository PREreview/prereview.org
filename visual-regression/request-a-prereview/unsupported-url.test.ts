import { DefaultLocale } from '../../src/locales/index.js'
import { unsupportedUrlPage } from '../../src/request-a-prereview-page/unsupported-url-page.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(unsupportedUrlPage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
