import { DefaultLocale } from '../../../src/locales/index.ts'
import * as _ from '../../../src/WebApp/RequestAReviewFlow/RequestAReviewPage/NotAPreprintPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(_.NotAPreprintPage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
