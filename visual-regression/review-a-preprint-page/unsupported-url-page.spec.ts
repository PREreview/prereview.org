import { DefaultLocale } from '../../src/locales/index.ts'
import { unsupportedUrlPage } from '../../src/review-a-preprint-page/unsupported-url-page.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(unsupportedUrlPage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
