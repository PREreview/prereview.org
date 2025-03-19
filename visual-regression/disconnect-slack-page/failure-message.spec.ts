import { failureMessage } from '../../src/disconnect-slack-page/failure-message.js'
import { DefaultLocale } from '../../src/locales/index.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(failureMessage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
