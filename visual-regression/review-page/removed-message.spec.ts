import { removedMessage } from '../../src/review-page/removed-message'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(removedMessage)

  await expect(content).toHaveScreenshot()
})
