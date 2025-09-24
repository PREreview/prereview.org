import { DefaultLocale } from '../../src/locales/index.ts'
import { failureMessage } from '../../src/log-in/failure-message.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(failureMessage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
