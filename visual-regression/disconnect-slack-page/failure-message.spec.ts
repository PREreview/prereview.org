import { failureMessage } from '../../src/disconnect-slack-page/failure-message.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(failureMessage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
