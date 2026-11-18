import { DefaultLocale } from '../../src/locales/index.ts'
import { createFailureMessage } from '../../src/WebApp/PreprintReviewPage/FailureMessage.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(createFailureMessage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
