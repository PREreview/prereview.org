import { DefaultLocale } from '../../../src/locales/index.js'
import { failureMessage } from '../../../src/write-review/publish-page/failure-message.js'
import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = failureMessage(DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
