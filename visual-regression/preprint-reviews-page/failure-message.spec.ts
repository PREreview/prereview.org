import { failureMessage } from '../../src/preprint-reviews-page/failure-message'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(failureMessage)

  await expect(content).toHaveScreenshot()
})
