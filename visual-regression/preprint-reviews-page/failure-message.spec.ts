import { failureMessage } from '../../src/preprint-reviews-page/failure-message.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(failureMessage)

  await expect(content).toHaveScreenshot()
})
