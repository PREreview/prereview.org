import { accessDeniedMessage } from '../../src/log-in/access-denied-message.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(accessDeniedMessage)

  await expect(content).toHaveScreenshot()
})
