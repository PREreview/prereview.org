import { DefaultLocale } from '../../src/locales/index.ts'
import { unsupportedDoiPage } from '../../src/WebApp/request-a-prereview-page/unsupported-doi-page.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(unsupportedDoiPage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
