import { removedMessage } from '../../src/review-page/removed-message.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(removedMessage)

  await expect(content).toHaveScreenshot()
})
