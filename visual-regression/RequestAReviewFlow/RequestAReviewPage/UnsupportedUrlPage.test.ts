import { DefaultLocale } from '../../../src/locales/index.ts'
import * as _ from '../../../src/WebApp/RequestAReviewFlow/RequestAReviewPage/UnsupportedUrlPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(_.UnsupportedUrlPage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
