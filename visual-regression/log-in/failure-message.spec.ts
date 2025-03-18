import { DefaultLocale } from '../../src/locales/index.js'
import { failureMessage } from '../../src/log-in/failure-message.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(failureMessage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
