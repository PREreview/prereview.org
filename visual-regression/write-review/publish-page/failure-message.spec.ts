import { DefaultLocale } from '../../../src/locales/index.ts'
import { failureMessage } from '../../../src/write-review/publish-page/failure-message.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = failureMessage(DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
