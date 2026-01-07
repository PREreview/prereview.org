import { DefaultLocale } from '../../src/locales/index.ts'
import { notAPreprintPage } from '../../src/WebApp/review-a-preprint-page/not-a-preprint-page.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(notAPreprintPage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
