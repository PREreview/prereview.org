import { DefaultLocale } from '../../../src/locales/index.ts'
import * as _ from '../../../src/WebApp/RequestAReviewFlow/RequestAReviewPage/UnsupportedDoiPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(_.UnsupportedDoiPage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
