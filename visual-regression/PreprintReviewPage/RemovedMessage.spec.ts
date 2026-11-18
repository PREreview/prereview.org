import { DefaultLocale } from '../../src/locales/index.ts'
import { createRemovedMessage } from '../../src/WebApp/PreprintReviewPage/RemovedMessage.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(createRemovedMessage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
