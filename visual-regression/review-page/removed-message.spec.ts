import { DefaultLocale } from '../../src/locales/index.ts'
import { removedMessage } from '../../src/WebApp/review-page/removed-message.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(removedMessage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
